import asyncio
import string
import random
import os
import queue
import threading
import traceback
from contextlib import asynccontextmanager
from typing import Any, Collection

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger
from openai import OpenAIError
from pydantic_core import SchemaValidator
from sqlalchemy.sql.elements import CollectionAggregate
from starlette.datastructures import UploadFile
from typing import List


from ..chatmanager import AutoGenChatManager, WebSocketConnectionManager
from ..database import workflow_from_id
from ..database.dbmanager import DBManager
from ..datamodel import (
    Agent,
    Message,
    Model,
    Response,
    Session,
    Skill,
    Workflow,
    Schema,
    SchemaField,
    Collections,
    CollectionRow,
    Implementation,
)
from ..utils import (
    check_and_cast_datetime_fields,
    init_app_folders,
    md5_hash,
    test_model,
)
from ..version import VERSION

managers = {"chat": None}  # manage calls to autogen
# Create thread-safe queue for messages between api thread and autogen threads
message_queue = queue.Queue()
active_connections = []
active_connections_lock = asyncio.Lock()
websocket_manager = WebSocketConnectionManager(
    active_connections=active_connections,
    active_connections_lock=active_connections_lock,
)


def message_handler():
    while True:
        message = message_queue.get()
        logger.info(
            "** Processing Agent Message on Queue: Active Connections: "
            + str([client_id for _, client_id in websocket_manager.active_connections])
            + " **"
        )
        for connection, socket_client_id in websocket_manager.active_connections:
            if message["connection_id"] == socket_client_id:
                logger.info(
                    f"Sending message to connection_id: {message['connection_id']}. Connection ID: {socket_client_id}"
                )
                asyncio.run(websocket_manager.send_message(message, connection))
            else:
                logger.info(
                    f"Skipping message for connection_id: {message['connection_id']}. Connection ID: {socket_client_id}"
                )
        message_queue.task_done()


message_handler_thread = threading.Thread(target=message_handler, daemon=True)
message_handler_thread.start()


app_file_path = os.path.dirname(os.path.abspath(__file__))
folders = init_app_folders(app_file_path)
ui_folder_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ui")
print(ui_folder_path)


database_engine_uri = folders["database_engine_uri"]
dbmanager = DBManager(engine_uri=database_engine_uri)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("***** App started *****")
    managers["chat"] = AutoGenChatManager(message_queue=message_queue)
    dbmanager.create_db_and_tables()

    yield
    # Close all active connections
    await websocket_manager.disconnect_all()
    print("***** App stopped *****")


app = FastAPI(lifespan=lifespan)


# allow cross origin requests for testing on localhost:800* ports only
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8001",
        "http://localhost:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


api = FastAPI(root_path="/api")
# mount an api route such that the main route serves the ui and the /api
app.mount("/api", api)

app.mount("/", StaticFiles(directory=ui_folder_path, html=True), name="ui")
api.mount(
    "/files",
    StaticFiles(directory=folders["files_static_root"], html=True),
    name="files",
)


# manage websocket connections


def create_entity(model: Any, model_class: Any, filters: dict = None):
    """Create a new entity"""
    model = check_and_cast_datetime_fields(model)
    try:
        response: Response = dbmanager.upsert(model)
        return response.model_dump(mode="json")

    except Exception as ex_error:
        print(ex_error)
        return {
            "status": False,
            "message": f"Error occurred while creating {model_class.__name__}: "
            + str(ex_error),
        }


def list_entity(
    model_class: Any,
    filters: dict = None,
    return_json: bool = True,
    order: str = "desc",
):
    """List all entities for a user"""
    return dbmanager.get(
        model_class, filters=filters, return_json=return_json, order=order
    )


def delete_entity(model_class: Any, filters: dict = None):
    """Delete an entity"""

    return dbmanager.delete(filters=filters, model_class=model_class)


@api.get("/schemas")
async def list_schema(user_id: str, schema_id: None | str = None):
    """List all schemas for a user"""
    filters = {
        "user_id": user_id,
        "isHide": False,
    }
    if schema_id is not None:
        filters["id"] = schema_id
        del filters["isHide"]
    return list_entity(Schema, filters=filters)


@api.post("/schemas")
async def create_or_update_schema(schema: Schema):
    """Create or update one schema"""
    return create_entity(schema, Schema, {})


@api.delete("/schemas/delete")
async def delete_schema(user_id: str, schema_id: str):
    """Delete a schema"""
    filters = {"id": schema_id, "user_id": user_id}
    return delete_entity(Schema, filters=filters)


@api.get("/collections")
async def list_collections(user_id: str, collection_id: None | int = None):
    """List all collections for a user"""
    filters = {"user_id": user_id}
    if collection_id is not None:
        filters["collection_id"] = collection_id
    return list_entity(Collections, filters=filters)


@api.post("/collections")
async def create_or_update_collections(
    req: Request,
    with_csv: bool = False,
):
    """Create or update one collection"""
    if with_csv:
        body = await req.form()

        data = {}
        file: str | None | UploadFile = None
        schema: None | Schema = None

        for k in body.keys():
            if k == "files[]":
                file = body.get(k)
            else:
                data[k] = body.get(k)

        if type(file) != UploadFile:
            return

        collection = None
        collection_id: None | int = None
        keys: List = []

        for i, line in enumerate(file.file.readlines()):
            buf = [s.decode("utf-8") for s in line.strip().split(b",")]
            if i == 0:
                user_id = data["user_id"]
                name = "".join(
                    random.choices(string.ascii_uppercase + string.digits, k=10)
                )

                description = "".join(
                    random.choices(string.ascii_uppercase + string.digits, k=10)
                )

                fields: List[SchemaField] = [
                    SchemaField(name=s, description=s).dict() for s in buf
                ]

                schema = Schema(
                    name=name,
                    description=description,
                    user_id=user_id,
                    fields=fields,
                    isHide=True,
                )

                data["schema_id"] = create_entity(schema, Schema, {})["data"]["id"]

                collection = create_entity(Collections(**data), Collections, {})
                collection_id = collection.get("data", {}).get("id", None)

                keys = buf
            else:
                if isinstance(collection_id, int):
                    create_entity(
                        CollectionRow(
                            collection_id=collection_id, data=dict(zip(keys, buf))
                        ),
                        CollectionRow,
                        {},
                    )

        return collection

    data = await req.json()
    return create_entity(Collections(**data), Collections, {})


@api.delete("/collections/delete")
async def delete_collection(user_id: str, collection_id: int):
    """Delete a collection"""
    filters = {"id": collection_id, "user_id": user_id}
    return delete_entity(Collections, filters=filters)


@api.get("/collection_rows")
async def list_collection_rows(collection_id: None | int = None):
    """List all collection_rows"""
    filters = {}
    if collection_id is not None:
        filters["collection_id"] = collection_id
    return list_entity(CollectionRow, filters=filters)


@api.post("/collection_rows")
async def create_or_update_collection_rows(
    collection_row: CollectionRow,
):
    """Create or update one collection_row"""
    return create_entity(collection_row, CollectionRow, {})


@api.delete("/collection_rows/delete")
async def delete_collection_row(collection_id: int, row_id: int):
    """Delete a collection_row"""
    filters = {"id": row_id, "collection_id": collection_id}
    return delete_entity(CollectionRow, filters=filters)


@api.get("/implementation")
async def list_implementation(agent_id: None | int = None):
    filters = {}
    if agent_id is not None:
        filters["agent_id"] = agent_id

    return list_entity(Implementation, filters=filters)


@api.get("/skills")
async def list_skills(user_id: str):
    """List all skills for a user"""
    filters = {"user_id": user_id}
    return list_entity(Skill, filters=filters)


@api.post("/skills")
async def create_skill(skill: Skill):
    """Create a new skill"""
    filters = {"user_id": skill.user_id}
    return create_entity(skill, Skill, filters=filters)


@api.delete("/skills/delete")
async def delete_skill(skill_id: int, user_id: str):
    """Delete a skill"""
    filters = {"id": skill_id, "user_id": user_id}
    return delete_entity(Skill, filters=filters)


@api.get("/models")
async def list_models(user_id: str):
    """List all models for a user"""
    filters = {"user_id": user_id}
    return list_entity(Model, filters=filters)


@api.post("/models")
async def create_model(model: Model):
    """Create a new model"""
    return create_entity(model, Model)


@api.post("/models/test")
async def test_model_endpoint(model: Model):
    """Test a model"""
    try:
        response = test_model(model)
        return {
            "status": True,
            "message": "Model tested successfully",
            "data": response,
        }
    except (OpenAIError, Exception) as ex_error:
        return {
            "status": False,
            "message": "Error occurred while testing model: " + str(ex_error),
        }


@api.delete("/models/delete")
async def delete_model(model_id: int, user_id: str):
    """Delete a model"""
    filters = {"id": model_id, "user_id": user_id}
    return delete_entity(Model, filters=filters)


@api.get("/agents")
async def list_agents(user_id: str):
    """List all agents for a user"""
    filters = {"user_id": user_id}
    return list_entity(Agent, filters=filters)


@api.post("/agents")
async def create_agent(agent: Agent):
    """Create a new agent"""
    return create_entity(agent, Agent)


@api.delete("/agents/delete")
async def delete_agent(agent_id: int, user_id: str):
    """Delete an agent"""
    filters = {"id": agent_id, "user_id": user_id}
    return delete_entity(Agent, filters=filters)


@api.post("/agents/link/model/{agent_id}/{model_id}")
async def link_agent_model(agent_id: int, model_id: int):
    """Link a model to an agent"""
    return dbmanager.link(
        link_type="agent_model", primary_id=agent_id, secondary_id=model_id
    )


@api.delete("/agents/link/model/{agent_id}/{model_id}")
async def unlink_agent_model(agent_id: int, model_id: int):
    """Unlink a model from an agent"""
    return dbmanager.unlink(
        link_type="agent_model", primary_id=agent_id, secondary_id=model_id
    )


@api.get("/agents/link/model/{agent_id}")
async def get_agent_models(agent_id: int):
    """Get all models linked to an agent"""
    return dbmanager.get_linked_entities("agent_model", agent_id, return_json=True)


@api.post("/agents/link/skill/{agent_id}/{skill_id}")
async def link_agent_skill(agent_id: int, skill_id: int):
    """Link an a skill to an agent"""
    return dbmanager.link(
        link_type="agent_skill", primary_id=agent_id, secondary_id=skill_id
    )


@api.delete("/agents/link/skill/{agent_id}/{skill_id}")
async def unlink_agent_skill(agent_id: int, skill_id: int):
    """Unlink an a skill from an agent"""
    return dbmanager.unlink(
        link_type="agent_skill", primary_id=agent_id, secondary_id=skill_id
    )


@api.get("/agents/link/skill/{agent_id}")
async def get_agent_skills(agent_id: int):
    """Get all skills linked to an agent"""
    return dbmanager.get_linked_entities("agent_skill", agent_id, return_json=True)


@api.post("/agents/link/agent/{primary_agent_id}/{secondary_agent_id}")
async def link_agent_agent(primary_agent_id: int, secondary_agent_id: int):
    """Link an agent to another agent"""
    return dbmanager.link(
        link_type="agent_agent",
        primary_id=primary_agent_id,
        secondary_id=secondary_agent_id,
    )


@api.delete("/agents/link/agent/{primary_agent_id}/{secondary_agent_id}")
async def unlink_agent_agent(primary_agent_id: int, secondary_agent_id: int):
    """Unlink an agent from another agent"""
    return dbmanager.unlink(
        link_type="agent_agent",
        primary_id=primary_agent_id,
        secondary_id=secondary_agent_id,
    )


@api.get("/agents/link/agent/{agent_id}")
async def get_linked_agents(agent_id: int):
    """Get all agents linked to an agent"""
    return dbmanager.get_linked_entities("agent_agent", agent_id, return_json=True)


@api.get("/workflows")
async def list_workflows(user_id: str):
    """List all workflows for a user"""
    filters = {"user_id": user_id}
    return list_entity(Workflow, filters=filters)


@api.get("/workflows/{workflow_id}")
async def get_workflow(workflow_id: int, user_id: str):
    """Get a workflow"""
    filters = {"id": workflow_id, "user_id": user_id}
    return list_entity(Workflow, filters=filters)


@api.post("/workflows")
async def create_workflow(workflow: Workflow):
    """Create a new workflow"""
    return create_entity(workflow, Workflow)


@api.delete("/workflows/delete")
async def delete_workflow(workflow_id: int, user_id: str):
    """Delete a workflow"""
    filters = {"id": workflow_id, "user_id": user_id}
    return delete_entity(Workflow, filters=filters)


@api.post("/workflows/link/agent/{workflow_id}/{agent_id}/{agent_type}")
async def link_workflow_agent(workflow_id: int, agent_id: int, agent_type: str):
    """Link an agent to a workflow"""
    return dbmanager.link(
        link_type="workflow_agent",
        primary_id=workflow_id,
        secondary_id=agent_id,
        agent_type=agent_type,
    )


@api.delete("/workflows/link/agent/{workflow_id}/{agent_id}/{agent_type}")
async def unlink_workflow_agent(workflow_id: int, agent_id: int, agent_type: str):
    """Unlink an agent from a workflow"""
    return dbmanager.unlink(
        link_type="workflow_agent",
        primary_id=workflow_id,
        secondary_id=agent_id,
        agent_type=agent_type,
    )


@api.get("/workflows/link/agent/{workflow_id}/{agent_type}")
async def get_linked_workflow_agents(workflow_id: int, agent_type: str):
    """Get all agents linked to a workflow"""
    return dbmanager.get_linked_entities(
        link_type="workflow_agent",
        primary_id=workflow_id,
        agent_type=agent_type,
        return_json=True,
    )


@api.get("/sessions")
async def list_sessions(user_id: str):
    """List all sessions for a user"""
    filters = {"user_id": user_id}
    return list_entity(Session, filters=filters)


@api.post("/sessions")
async def create_session(session: Session):
    """Create a new session"""
    return create_entity(session, Session)


@api.delete("/sessions/delete")
async def delete_session(session_id: int, user_id: str):
    """Delete a session"""
    filters = {"id": session_id, "user_id": user_id}
    return delete_entity(Session, filters=filters)


@api.get("/sessions/{session_id}/messages")
async def list_messages(user_id: str, session_id: int):
    """List all messages for a use session"""
    filters = {"user_id": user_id, "session_id": session_id}
    return list_entity(Message, filters=filters, order="asc", return_json=True)


@api.post("/sessions/{session_id}/workflow/{workflow_id}/run")
async def run_session_workflow(message: Message, session_id: int, workflow_id: int):
    """Runs a workflow on provided message"""
    try:
        user_message_history = (
            dbmanager.get(
                Message,
                filters={"user_id": message.user_id, "session_id": message.session_id},
                return_json=True,
            ).data
            if session_id is not None
            else []
        )
        # save incoming message
        dbmanager.upsert(message)
        user_dir = os.path.join(
            folders["files_static_root"], "user", md5_hash(message.user_id)
        )
        os.makedirs(user_dir, exist_ok=True)
        workflow = workflow_from_id(workflow_id, dbmanager=dbmanager)
        agent_response: Message = managers["chat"].chat(
            message=message,
            history=user_message_history,
            user_dir=user_dir,
            workflow=workflow,
            connection_id=message.connection_id,
        )

        response: Response = dbmanager.upsert(agent_response)
        return response.model_dump(mode="json")
    except Exception as ex_error:
        print(traceback.format_exc())
        return {
            "status": False,
            "message": "Error occurred while processing message: " + str(ex_error),
        }


@api.get("/version")
async def get_version():
    return {
        "status": True,
        "message": "Version retrieved successfully",
        "data": {"version": VERSION},
    }


# websockets


async def process_socket_message(data: dict, websocket: WebSocket, client_id: str):
    print(f"Client says: {data['type']}")
    if data["type"] == "user_message":
        user_message = Message(**data["data"])
        session_id = data["data"].get("session_id", None)
        workflow_id = data["data"].get("workflow_id", None)
        response = await run_session_workflow(
            message=user_message, session_id=session_id, workflow_id=workflow_id
        )
        response_socket_message = {
            "type": "agent_response",
            "data": response,
            "connection_id": client_id,
        }
        await websocket_manager.send_message(response_socket_message, websocket)


@api.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket_manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_json()
            await process_socket_message(data, websocket, client_id)
    except WebSocketDisconnect:
        print(f"Client #{client_id} is disconnected")
        await websocket_manager.disconnect(websocket)
