import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
  PlusIcon,
  TrashIcon
} from "@heroicons/react/24/outline";
import { Button, Dropdown, Input, MenuProps, Modal, message } from "antd";
import { LeftOutlined } from "@ant-design/icons";
import * as React from "react";
import { ISchema, IStatus } from "../../types";
import { appContext } from "../../../hooks/provider";
import {
  fetchJSON,
  getServerUrl,
  sanitizeConfig,
  setLocalStorage,
  timeAgo,
  truncateText,
} from "../../utils";
import {
  BounceLoader,
  Card,
  CardHoverBar,
  ControlRowView,
  LoadingOverlay,
} from "../../atoms";
import TextArea from "antd/es/input/TextArea";
import { ModelConfigView } from "./utils/modelconfig";
import { SchemaConfigView } from "./utils/schemaconfig";

const SchemasView = ({ }: any) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<IStatus | null>({
    status: true,
    message: "All good",
  });

  const { user } = React.useContext(appContext);
  const serverUrl = getServerUrl();
  const listSchemasUrl = `${serverUrl}/schemas?user_id=${user?.email}`;
  const saveSchemaUrl = `${serverUrl}/schemas`;

  const defaultSchema: ISchema = {
    user_id: user?.email,
    name: '',
    description: '',
    fields: []
  };

  const testSchemas: ISchema[] = [{
    user_id: user?.email,
    id: 123,
    name: 'schema1',
    description: 'schema1 desc',
    fields: [{
      name: '',
      description: '',
      true_type: 'any',
      mode: 'any'
    }]
  }]

  const [schemas, setSchemas] = React.useState<ISchema[] | null>([]);
  const [selectedSchema, setSelectedSchema] = React.useState<ISchema | null>(
    null
  );
  const [newSchema, setNewSchema] = React.useState<ISchema | null>(
  );

  const [showNewSchemaDetail, setShowNewSchemaDetail] = React.useState(false);
  const [showSchemaDetail, setShowSchemaDetail] = React.useState(false);

  const deleteSchema = (schema: ISchema) => {
    setError(null);
    setLoading(true);
    const deleteSchemaUrl = `${serverUrl}/schemas/delete?user_id=${user?.email}&schema_id=${schema.id}`;
    const payLoad = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const onSuccess = (data: any) => {
      if (data && data.status) {
        message.success(data.message);
        fetchSchemas();
      } else {
        message.error(data.message);
      }
      setLoading(false);
    };
    const onError = (err: any) => {
      setError(err);
      message.error(err.message);
      setLoading(false);
    };
    fetchJSON(deleteSchemaUrl, payLoad, onSuccess, onError);
  };

  const fetchSchemas = () => {
    setError(null);
    setLoading(true);
    const payLoad = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const onSuccess = (data: any) => {
      if (data && data.status) {
        setSchemas(data.data);
      } else {
        message.error(data.message);
      }
      setLoading(false);
    };
    const onError = (err: any) => {
      setError(err);
      message.error(err.message);
      setLoading(false);
    };
    fetchJSON(listSchemasUrl, payLoad, onSuccess, onError);
  };

  const saveSchema = (schema: ISchema, callback: (nextSchema: ISchema) => void) => {
    setError(null);
    setLoading(true);
    schema.user_id = user?.email;

    const payLoad = {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(schema),
    };

    const onSuccess = (data: any) => {
      if (data && data.status) {
        message.success(data.message);
        if (callback) {
          callback(data.data);
        }
      } else {
        message.error(data.message);
      }
      setLoading(false);
    };
    const onError = (err: any) => {
      setError(err);
      message.error(err.message);
      setLoading(false);
    };
    fetchJSON(saveSchemaUrl, payLoad, onSuccess, onError);
  };

  React.useEffect(() => {
    if (user) {
      // console.log("fetching messages", messages);
      fetchSchemas();
      // setSchemas(testSchemas);
    }
  }, []);

  const schemaRows = (schemas || []).map((schema: ISchema, i: number) => {
    const cardItems = [
      {
        title: "Delete",
        icon: TrashIcon,
        onClick: (e: any) => {
          e.stopPropagation();
          deleteSchema(schema);
        },
        hoverText: "Delete",
      },
    ];
    return (
      <li
        role="listitem"
        key={"modelrow" + i}
        className=" "
        style={{ width: "200px" }}
      >
        <Card
          className="h-full p-2 cursor-pointer"
          title={
            <div className="  ">{truncateText(schema.name || "", 20)}</div>
          }
          onClick={() => {
            setSelectedSchema(schema);
            setShowSchemaDetail(true);
          }}
        >
          <div style={{ minHeight: "65px" }} className="my-2   break-words">
            {" "}
            {truncateText(schema.description || "", 70)}
          </div>
          <div
            aria-label={`Updated ${timeAgo(schema.updated_at || "")} `}
            className="text-xs"
          >
            {timeAgo(schema.updated_at || "")}
          </div>
          <CardHoverBar items={cardItems} />
        </Card>
      </li>
    );
  });

  const SchemaDetail = ({
    schema,
    setSchema,
    showSchemaDetail,
    setShowSchemaDetail,
    handler,
  }: {
    schema: ISchema;
    setSchema: (model: ISchema | null) => void;
    showSchemaDetail: boolean;
    setShowSchemaDetail: (show: boolean) => void;
    handler?: (agent: ISchema) => void;
  }) => {
    const [localSchema, setLocalSchema] = React.useState<ISchema>(schema);

    const closeDetail = () => {
      setSchema(null);
      setShowSchemaDetail(false);
      if (handler) {
        handler(schema);
      }
    };

    return (
      <div className="mb-2   relative">
        <div className="     rounded  ">
          <div className="flex mt-2 pb-2 mb-2 border-b">
            <div className="flex-1 font-semibold mb-2 ">
              <LeftOutlined onClick={() => {
                setShowSchemaDetail(false);
                setSelectedSchema(null);
                setShowNewSchemaDetail(false);
                fetchSchemas();
              }} />
              {" "}
              Schema detail
            </div>
          </div>
          {loading && (
            <div className="  w-full text-center">
              {" "}
              <BounceLoader />{" "}
              <span className="inline-block"> loading .. </span>
            </div>
          )}
          {
            localSchema &&
            <SchemaConfigView
              schema={localSchema}
              setSchema={setSchema}
              close={closeDetail}
            />
          }

        </div>
      </div>
    );
  };

  return (
    <div className="text-primary  ">
      {selectedSchema && (
        <SchemaDetail
          key="schema-detail"
          schema={selectedSchema}
          setSchema={(nextSchema) => {
            if (!nextSchema) {
              return
            }
            saveSchema(nextSchema, (returnedSchema) => {
              setSelectedSchema(returnedSchema);
            })
          }}
          setShowSchemaDetail={setShowSchemaDetail}
          showSchemaDetail={showSchemaDetail}
          handler={(model: ISchema | null) => {
            fetchSchemas();
          }}
        />
      )}
      {showNewSchemaDetail && <SchemaDetail
        key="new-schema-detail"
        schema={newSchema || defaultSchema}
        setSchema={(nextSchema) => {
          if (!nextSchema) {
            return
          }
          saveSchema(nextSchema, (returnedSchema) => {
            setShowNewSchemaDetail(false);
            setShowSchemaDetail(true);
            setSelectedSchema(returnedSchema);
          })
        }}
        setShowSchemaDetail={setShowNewSchemaDetail}
        showSchemaDetail={showNewSchemaDetail}
        handler={(model: ISchema | null) => {
          fetchSchemas();
        }}
      />
      }
      {!showSchemaDetail && !showNewSchemaDetail &&
        <div className="mb-2   relative">
          <div className="     rounded  ">
            <div className="flex mt-2 pb-2 mb-2 border-b">
              <div className="flex-1 font-semibold mb-2 ">
                {" "}
                Schemas ({schemaRows.length}){" "}
              </div>
              <div>
                <Button
                  type="primary"
                  // menu={{
                  //   items: modelsMenuItems,
                  //   onClick: modelsMenuItemOnClick,
                  // }}
                  // placement="bottomRight"
                  // trigger={["click"]}
                  onClick={() => {
                    setNewSchema({
                      user_id: user?.email,
                      name: "",
                      description: "",
                      fields: []
                    });
                    setShowNewSchemaDetail(true);
                  }}
                >
                  <PlusIcon className="w-5 h-5 inline-block mr-1" />
                  New Schema
                </Button>
              </div>
            </div>

            <div className="text-xs mb-2 pb-1  ">
              {" "}
              Schemas define the format of the data in a dataset.
              {/* {selectedSchema?.model} */}
            </div>
            {schemas && schemas.length > 0 && (
              <div className="w-full  relative">
                <LoadingOverlay loading={loading} />
                <ul className="   flex flex-wrap gap-3">{schemaRows}</ul>
              </div>
            )}

            {schemas && schemas.length === 0 && !loading && (
              <div className="text-sm border mt-4 rounded text-secondary p-2">
                <InformationCircleIcon className="h-4 w-4 inline mr-1" />
                No schema found. Please create a new schema which can be reused
                with signatures.
              </div>
            )}

            {loading && (
              <div className="  w-full text-center">
                {" "}
                <BounceLoader />{" "}
                <span className="inline-block"> loading .. </span>
              </div>
            )}
          </div>
        </div>
      }
    </div>
  );
};

export default SchemasView;
