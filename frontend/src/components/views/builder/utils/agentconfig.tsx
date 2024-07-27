import React from "react";
import { CollapseBox, ControlRowView } from "../../../atoms";
import { checkAndSanitizeInput, fetchJSON, getServerUrl } from "../../../utils";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Slider,
  Table,
  Tabs,
  message,
  theme,
} from "antd";
import { LeftOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  BugAntIcon,
  CpuChipIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { appContext } from "../../../../hooks/provider";
import {
  AgentSelector,
  AgentTypeSelector,
  ModelSelector,
  SkillSelector,
} from "./selectors";
import { IAgent, ICollection, IImplementation, ILLMConfig, IModelConfig, ISchema, ISignatureCompileRequest, ISkill } from "../../../types";
import TextArea from "antd/es/input/TextArea";
import { cloneDeep } from "lodash";
import { Agent } from "http";

const { useToken } = theme;

export const AgentConfigView = ({
  agent,
  setAgent,
  schemas,
  skills,
  close,
}: {
  agent: IAgent;
  setAgent: (agent: IAgent) => void;
  schemas: ISchema[];
  skills: ISkill[];
  close: () => void;
}) => {
  const nameValidation = checkAndSanitizeInput(agent?.config?.name);
  const [error, setError] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const { user } = React.useContext(appContext);
  const serverUrl = getServerUrl();
  const createAgentUrl = `${serverUrl}/agents`;

  const [controlChanged, setControlChanged] = React.useState<boolean>(false);

  const onControlChange = (value: any, key: string) => {
    // if (key === "llm_config") {
    //   if (value.config_list.length === 0) {
    //     value = false;
    //   }
    // }
    const updatedAgent = {
      ...agent,
      config: { ...agent.config, [key]: value },
    };

    setAgent(updatedAgent);
    setControlChanged(true);
  };

  const onAgentChange = (value: any, key: string) => {

    const updatedAgent = {
      ...agent,
      [key]: value,
    };

    setAgent(updatedAgent);
    setControlChanged(true);
  };

  const llm_config: ILLMConfig = agent?.config?.llm_config || {
    config_list: [],
    temperature: 0.1,
    max_tokens: 1000,
  };

  const createAgent = (agent: IAgent) => {
    setError(null);
    setLoading(true);

    agent.user_id = user?.email;
    const payLoad = {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(agent),
    };

    const onSuccess = (data: any) => {
      if (data && data.status) {
        message.success(data.message);
        console.log("agents", data.data);
        const newAgent = data.data;
        setAgent(newAgent);
      } else {
        message.error(data.message);
      }
      setLoading(false);
      // setNewAgent(sampleAgent);
    };
    const onError = (err: any) => {
      setError(err);
      message.error(err.message);
      setLoading(false);
    };
    const onFinal = () => {
      setLoading(false);
      setControlChanged(false);
    };

    fetchJSON(createAgentUrl, payLoad, onSuccess, onError, onFinal);
  };

  const hasChanged =
    (!controlChanged || !nameValidation.status) && agent?.id !== undefined;

  return (
    <div className="text-primary">
      <Form>
        <div
        // className={`grid  gap-3 ${agent.type === "groupchat" ? "grid-cols-2" : "grid-cols-1"
        //   }`}
        >
          <div className="">
            <ControlRowView
              title="Name"
              className=""
              description="Name of the signature"
              value=""
              control={
                <>
                  <Input
                    className="mt-2"
                    placeholder="Signature Name"
                    value={agent?.config?.name}
                    onChange={(e) => {
                      onControlChange(e.target.value, "name");
                    }}
                  />
                  {!nameValidation.status && (
                    <div className="text-xs text-red-500 mt-2">
                      {nameValidation.message}
                    </div>
                  )}
                </>
              }
            />

            <ControlRowView
              title="Description"
              className="mt-4"
              description=""
              value={""}
              control={
                <Input
                  className="mt-2"
                  placeholder="Signature Description"
                  value={agent.config.description || ""}
                  onChange={(e) => {
                    onControlChange(e.target.value, "description");
                  }}
                />
              }
            />

            <ControlRowView
              title="Schema"
              className="mt-4"
              description=""
              value={""}
              extra={
                <Select
                  placeholder="Select schema"
                  value={agent.schema_id}
                  onChange={(value) => {
                    onAgentChange(value, "schema_id");
                  }}
                >
                  {
                    schemas.map((opt) =>
                      <Select.Option key={opt.id} value={opt.id}>
                        {
                          opt.name
                        }
                      </Select.Option>)
                  }
                </Select>
              }
              control={
                <Table
                  dataSource={agent.schema_id && schemas.filter((schema) => schema.id === agent.schema_id)}
                  columns={[{
                    title: "Name",
                    dataIndex: "name"
                  }, {
                    title: "Description",
                    dataIndex: "description"
                  }]}
                  rowKey="id"
                />
              }
            />

            <ControlRowView
              title="Functions"
              className="mt-4"
              description=""
              value={""}
              extra={
                <Select
                  placeholder="Select function"
                  value={null}
                  onChange={(value) => {

                    const nextSkills = cloneDeep(agent.functions) || [];
                    const selected = skills.find((item) => item.id === value);

                    if (selected) {
                      nextSkills.push(selected);
                    }

                    onAgentChange(nextSkills, "functions");
                  }}
                >
                  {
                    skills.map((opt) =>
                      <Select.Option key={opt.id} value={opt.id}>
                        {
                          opt.name
                        }
                      </Select.Option>)
                  }
                </Select>
              }
              control={
                <Table
                  dataSource={agent.functions}
                  columns={[{
                    title: "Name",
                    dataIndex: "name"
                  }, {
                    title: "Description",
                    dataIndex: "description"
                  }, {
                    dataIndex: "",
                    width: 50,
                    render: (_, record, index) => {
                      return <div className="hidden-cell">
                        <DeleteOutlined
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            const nextSkills = cloneDeep(agent.functions) || [];
                            nextSkills.splice(index, 1);
                            onAgentChange(nextSkills, "functions");
                          }}
                        />
                      </div>;
                    }
                  }]}
                  rowKey="id"
                />
              }
            />

            <ControlRowView
              title="Max Consecutive Auto Reply"
              className="mt-4"
              description="Max consecutive auto reply messages before termination."
              // value={agent.config?.max_consecutive_auto_reply}
              value=""
              titleExtra={<InputNumber
                min={1}
                max={agent.type === "groupchat" ? 600 : 30}
                defaultValue={agent.config.max_consecutive_auto_reply}
                step={1}
                onChange={(value: any) => {
                  onControlChange(value, "max_consecutive_auto_reply");
                }}
              />}
              control={""
                // <Slider
                //   min={1}
                //   max={agent.type === "groupchat" ? 600 : 30}
                //   defaultValue={agent.config.max_consecutive_auto_reply}
                //   step={1}
                //   onChange={(value: any) => {
                //     onControlChange(value, "max_consecutive_auto_reply");
                //   }}
                // />
              }
            />

            <ControlRowView
              title="Human Input Mode"
              description="Defines when to request human input"
              // value={agent.config.human_input_mode}
              value=""
              titleExtra={
                <Select
                  className="mt-2 w-full"
                  defaultValue={agent.config.human_input_mode}
                  onChange={(value: any) => {
                    onControlChange(value, "human_input_mode");
                  }}
                  options={
                    [
                      { label: "NEVER", value: "NEVER" },
                      // { label: "TERMINATE", value: "TERMINATE" },
                      // { label: "ALWAYS", value: "ALWAYS" },
                    ] as any
                  }
                />
              }
              control={
                ""
              }
            />

            <ControlRowView
              title="System Message"
              className="mt-4"
              description="Free text to control agent behavior"
              // value={agent.config.system_message}
              value=""
              control={
                <TextArea
                  className="mt-2 w-full"
                  value={agent.config.system_message}
                  rows={3}
                  onChange={(e) => {
                    onControlChange(e.target.value, "system_message");
                  }}
                />
              }
            />

            <div className="mt-4">
              {" "}
              <CollapseBox
                className="bg-secondary mt-4"
                open={false}
                title="Advanced Options"
              >
                <ControlRowView
                  title="Temperature"
                  className="mt-4"
                  description="Defines the randomness of the agent's response."
                  // value={llm_config.temperature}
                  value=""
                  titleExtra={
                    <InputNumber
                      min={0}
                      max={2}
                      step={0.1}
                      defaultValue={llm_config.temperature || 0.1}
                      onChange={(value: any) => {
                        const llm_config = {
                          ...agent.config.llm_config,
                          temperature: value,
                        };
                        onControlChange(llm_config, "llm_config");
                      }}
                    />
                  }
                  control={""
                    // <Slider
                    //   min={0}
                    //   max={2}
                    //   step={0.1}
                    //   defaultValue={llm_config.temperature || 0.1}
                    //   onChange={(value: any) => {
                    //     const llm_config = {
                    //       ...agent.config.llm_config,
                    //       temperature: value,
                    //     };
                    //     onControlChange(llm_config, "llm_config");
                    //   }}
                    // />
                  }
                />

                <ControlRowView
                  title="Agent Default Auto Reply"
                  className="mt-4"
                  description="Default auto reply when no code execution or llm-based reply is generated."
                  // value={agent.config.default_auto_reply || ""}
                  value=""
                  control={
                    <Input
                      className="mt-2"
                      placeholder="Agent Description"
                      value={agent.config.default_auto_reply || ""}
                      onChange={(e) => {
                        onControlChange(e.target.value, "default_auto_reply");
                      }}
                    />
                  }
                />

                <ControlRowView
                  title="Max Tokens"
                  description="Max tokens generated by LLM used in the agent's response."
                  // value={llm_config.max_tokens}
                  value=""
                  className="mt-4"
                  titleExtra={
                    <InputNumber
                      min={100}
                      max={50000}
                      defaultValue={llm_config.max_tokens || 1000}
                      onChange={(value: any) => {
                        const llm_config = {
                          ...agent.config.llm_config,
                          max_tokens: value,
                        };
                        onControlChange(llm_config, "llm_config");
                      }}
                    />
                  }
                  control=""
                />
                <ControlRowView
                  title="Code Execution Config"
                  className="mt-4"
                  description="Determines if and where code execution is done."
                  // value={agent.config.code_execution_config || "none"}
                  value=""
                  titleExtra={
                    <Select
                      className="mt-2"
                      defaultValue={
                        agent.config.code_execution_config || "none"
                      }
                      onChange={(value: any) => {
                        onControlChange(value, "code_execution_config");
                      }}
                      options={
                        [
                          { label: "None", value: "none" },
                          { label: "Local", value: "local" },
                          { label: "Docker", value: "docker" },
                        ] as any
                      }
                    />
                  }
                  control=""
                />
              </CollapseBox>
            </div>
          </div>
          {/* ====================== Group Chat Config ======================= */}
          {/* {agent.type === "groupchat" && (
            <div>
              <ControlRowView
                title="Speaker Selection Method"
                description="How the next speaker is selected"
                className=""
                // value={agent?.config?.speaker_selection_method || "auto"}
                value=""
                titleExtra={
                  <Select
                    className="mt-2 w-full"
                    defaultValue={
                      agent?.config?.speaker_selection_method || "auto"
                    }
                    onChange={(value: any) => {
                      if (agent?.config) {
                        onControlChange(value, "speaker_selection_method");
                      }
                    }}
                    options={
                      [
                        { label: "Auto", value: "auto" },
                        { label: "Round Robin", value: "round_robin" },
                        { label: "Random", value: "random" },
                      ] as any
                    }
                  />
                }
                control=""
              />

              <ControlRowView
                title="Admin Name"
                className="mt-4"
                description="Name of the admin of the group chat"
                // value={agent.config.admin_name || ""}
                value=""
                control={
                  <Input
                    className="mt-2"
                    placeholder="Agent Description"
                    value={agent.config.admin_name || ""}
                    onChange={(e) => {
                      onControlChange(e.target.value, "admin_name");
                    }}
                  />
                }
              />

              <ControlRowView
                title="Max Rounds"
                className="mt-4"
                description="Max rounds before termination."
                value={agent.config?.max_round || 10}
                control={
                  <Slider
                    min={10}
                    max={600}
                    defaultValue={agent.config.max_round}
                    step={1}
                    onChange={(value: any) => {
                      onControlChange(value, "max_round");
                    }}
                  />
                }
              />

              <ControlRowView
                title="Allow Repeat Speaker"
                className="mt-4"
                description="Allow the same speaker to speak multiple times in a row"
                value={agent.config?.allow_repeat_speaker || false}
                control={
                  <Select
                    className="mt-2 w-full"
                    defaultValue={agent.config.allow_repeat_speaker}
                    onChange={(value: any) => {
                      onControlChange(value, "allow_repeat_speaker");
                    }}
                    options={
                      [
                        { label: "True", value: true },
                        { label: "False", value: false },
                      ] as any
                    }
                  />
                }
              />
            </div>
          )} */}
        </div>
      </Form>

      <div className="w-full mt-4 text-right">
        {" "}
        {!hasChanged && (
          <Button
            type="primary"
            onClick={() => {
              createAgent(agent);
              setAgent(agent);
            }}
            loading={loading}
          >
            {agent.id ? "Save" : "Create"}
          </Button>
        )}
        {/* <Button
          className="ml-2"
          key="close"
          type="default"
          onClick={() => {
            close();
          }}
        >
          Close
        </Button> */}
      </div>
    </div>
  );
};

export const AgentCompileView = ({ agentId, agent, models, collections, skills, agents }:
  {
    agentId: number,
    agent: IAgent,
    models: IModelConfig[],
    collections: ICollection[],
    skills: ISkill[],
    agents: IAgent[],
  }) => {

  const serverUrl = getServerUrl();

  const [loading, setLoading] = React.useState<boolean>(false);
  const [data, setData] = React.useState<ISignatureCompileRequest>({
    agent_id: agentId,
    models: [null, null],
    training_sets: [],
    development_sets: [],
    implementation_name: "",
    implementation_description: ""
  })

  const [saveName, setSaveName] = React.useState<string>("");
  const [saveDesc, setSaveDesc] = React.useState<string>("");
  const [saveModalOpen, setSaveModalOpen] = React.useState<boolean>(false);

  const cacheUrl = `${serverUrl}/implementations/request_cache?agent_id=${agentId}`
  const compileUrl = `${serverUrl}/implementations/compile`
  const fetchCache = () => {
    setLoading(true);
    const payLoad = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const onSuccess = (data: any) => {
      if (data && data.status) {
        setData(data.data);
      } else {
        message.error(data.message);
      }
      setLoading(false);
    };
    const onError = (err: any) => {
      // setError(err);
      message.error(err.message);
      setLoading(false);
    };
    fetchJSON(cacheUrl, payLoad, onSuccess, onError);
  };

  const compile = () => {
    setLoading(true);
    const payLoad = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        name: saveName,
        description: saveDesc
      })
    };

    const onSuccess = (data: any) => {
      if (data && data.status) {
        setData(data.data);
        setSaveModalOpen(false);
      } else {
        message.error(data.message);
      }
      setLoading(false);
    };
    const onError = (err: any) => {
      // setError(err);
      message.error(err.message);
      setLoading(false);
    };
    fetchJSON(compileUrl, payLoad, onSuccess, onError);
  };

  React.useEffect(() => {
    fetchCache();
  }, [])

  return <div className="">
    <ControlRowView
      title="Model"
      description=""
      value=""
      titleExtra={<Select placeholder="Select model" value={data.models[0]?.id}
        onChange={(value) => {
          const nextModels = cloneDeep(data.models) || [null, null];
          const selected = models.find((item) => item.id === value);
          if (selected) {

            if (nextModels.length < 1) {
              nextModels.push(null, null)
            }

            nextModels[0] = selected
          }

          setData({
            ...data,
            models: nextModels
          });
        }}
      >
        {
          models.map((item) => <Select.Option key={item.id} value={item.id}>{item.model}</Select.Option>)
        }
      </Select>}
      control={""}
    />
    <ControlRowView
      title="Training set"
      description=""
      value=""
      extra={<Select placeholder="Select collection" value={null}
        onChange={(value) => {
          const nextSets = cloneDeep(data.training_sets) || [];
          const selected = collections.find((item) => item.id === value);
          if (selected) {
            nextSets.push(selected);
          }

          setData({
            ...data,
            training_sets: nextSets
          });
        }}
      >
        {
          collections.filter(item => item.schema_id === agent.schema_id).map((item) => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)
        }
      </Select>}
      control={<Table
        rowKey="id"
        dataSource={data.training_sets}
        columns={[{
          title: "Name",
          dataIndex: "name"
        }, {
          title: "Description",
          dataIndex: "description"
        }, {
          dataIndex: "",
          width: 50,
          render: (_, record, index) => {
            return <div className="hidden-cell">
              <DeleteOutlined
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const nextSets = cloneDeep(data.training_sets) || [];
                  nextSets.splice(index, 1);
                  setData({
                    ...data,
                    training_sets: nextSets
                  });
                }}
              />
            </div>;
          }
        }]}
      />}
    />
    {/* <ControlRowView
      title="Development set"
      description=""
      value=""
      extra={<Select placeholder="Select collection" value={null}
        onChange={(value) => {
          const nextSets = cloneDeep(data.development_sets) || [];
          const selected = collections.find((item) => item.id === value);
          if (selected) {
            nextSets.push(selected);
          }

          setData({
            ...data,
            development_sets: nextSets
          });
        }}
      >
        {
          collections.map((item) => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)
        }
      </Select>}
      control={<Table
        rowKey="id"
        dataSource={data.development_sets}
        columns={[{
          title: "Name",
          dataIndex: "name"
        }, {
          title: "Description",
          dataIndex: "description"
        }, {
          dataIndex: "",
          width: 50,
          render: (_, record, index) => {
            return <div className="hidden-cell">
              <DeleteOutlined
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const nextSets = cloneDeep(data.development_sets) || [];
                  nextSets.splice(index, 1);
                  setData({
                    ...data,
                    development_sets: nextSets
                  });
                }}
              />
            </div>;
          }
        }]}
      />}
    /> */}
    <ControlRowView
      title="Prompt strategy"
      description=""
      value=""
      titleExtra={<Select
        placeholder="Select strategy"
        value={data.prompt_strategy}
        onChange={(value) => {
          setData({
            ...data,
            prompt_strategy: value
          });
        }}
      >
        {
          ['Predict', 'ChainOfThought', 'ReAct'].map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)
        }
      </Select>}
      control=""
    />
    <ControlRowView
      title="Optimizer"
      description=""
      value=""
      titleExtra={<Select
        placeholder="Select optimizer"
        value={data.optimizer}
        onChange={(value) => {
          setData({
            ...data,
            optimizer: value
          });
        }}
      >
        {
          ['LabeledFewShot', 'BootstrapFewShot', 'BootstrapFewShotWithRandomSearch', 'BootstrapFewShotWithOptuna', 'KNNFewShot'].map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)
        }
      </Select>}
      control=""
    />
    {data.optimizer && ['BootstrapFewShot', 'BootstrapFewShotWithRandomSearch', 'BootstrapFewShotWithOptuna'].indexOf(data.optimizer) !== -1 &&
      <ControlRowView
        title="Teacher model"
        description=""
        value=""
        titleExtra={<Select placeholder="Select model" value={data.models[1]?.id}
          onChange={(value) => {
            const nextModels = cloneDeep(data.models) || [null, null];
            const selected = models.find((item) => item.id === value);
            if (selected) {

              if (nextModels.length < 1) {
                nextModels.push(null, null)
              } else if (nextModels.length === 1) {
                nextModels.push(null)
              }

              nextModels[1] = selected
            }

            setData({
              ...data,
              models: nextModels
            });
          }}
        >
          {
            models.map((item) => <Select.Option key={item.id} value={item.id}>{item.model}</Select.Option>)
          }
        </Select>}
        control={""}
      /> || ""
    }
    <ControlRowView
      title="Metric"
      description=""
      value=""
      titleExtra={<Select
        placeholder="Select metric"
        value={data.metric_id}
        onChange={(value) => {
          setData({
            ...data,
            metric_id: value,
            metric_type: skills.find((item) => item.id === value) ? 'skill' : 'agent'
          });
        }}
      >
        {
          skills.map((item) => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)
        }
        {
          agents.map((item) => <Select.Option key={item.id} value={item.id}>{item.config.name}</Select.Option>)
        }
      </Select>}
      control=""
    />
    <div className="w-full mt-4 text-right">
      {" "}

      <Button
        type="primary"
        onClick={() => {
          setSaveName("");
          setSaveDesc("");
          setSaveModalOpen(true);
        }}
        loading={loading}
      >
        Compile
      </Button>
    </div>
    <Modal
      title="Save the implementation"
      open={saveModalOpen}
      onOk={() => {
        if (!saveName) {
          message.warning("Name is required");
          return;
        }
        compile();
      }}
      onCancel={() => {
        setSaveModalOpen(false);
      }}
    >
      <ControlRowView
        title="Name"
        className=""
        description=""
        value=""
        control={
          <Input
            className="mt-2"
            placeholder="Please enter the name of the implementation"
            value={saveName}
            onChange={(e) => {
              setSaveName(e.target.value);
            }}
          />
        }
      />

      <ControlRowView
        title="Description"
        className="mt-4"
        description=""
        value={""}
        control={
          <Input
            className="mt-2"
            placeholder="Please enter the description of the implementation"
            value={saveDesc}
            onChange={(e) => {
              setSaveDesc(e.target.value);
            }}
          />
        }
      />
    </Modal>
  </div>;
}

export const ImplementationView = ({ agentId, models, collections, skills, agents }:
  {
    agentId: number,
    models: IModelConfig[],
    collections: ICollection[],
    skills: ISkill[],
    agents: IAgent[],
  }) => {

  const serverUrl = getServerUrl();

  const [loading, setLoading] = React.useState<boolean>(false);
  const [data, setData] = React.useState<IImplementation[]>([]);


  const listImplementationUrl = `${serverUrl}/implementations?agent_id=${agentId}`
  const deleteImplementationUrl = `${serverUrl}/implementations/delete?agent_id=${agentId}`

  const fetchImplementations = () => {
    setLoading(true);
    const payLoad = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const onSuccess = (data: any) => {
      if (data && data.status) {
        setData(data.data);
      } else {
        message.error(data.message);
      }
      setLoading(false);
    };
    const onError = (err: any) => {
      // setError(err);
      message.error(err.message);
      setLoading(false);
    };
    fetchJSON(listImplementationUrl, payLoad, onSuccess, onError);
  };

  const deleteImplementation = (id: number) => {
    setLoading(true);
    const payLoad = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const onSuccess = (data: any) => {
      if (data && data.status) {
        fetchImplementations();
      } else {
        message.error(data.message);
      }
      setLoading(false);
    };
    const onError = (err: any) => {
      // setError(err);
      message.error(err.message);
      setLoading(false);
    };
    fetchJSON(deleteImplementationUrl, payLoad, onSuccess, onError);
  };

  React.useEffect(() => {
    fetchImplementations();
  }, [])

  return <div className="">
    <Table
      dataSource={data}
      columns={[{
        title: "Name",
        dataIndex: "name"
      }, {
        title: "Description",
        dataIndex: "description"
      }, {
        title: "Time",
        dataIndex: "created_at"
      }, {
        dataIndex: "",
        width: 50,
        render: (_, record, index) => {
          return <div className="hidden-cell">
            <DeleteOutlined
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                if (record.id) {
                  deleteImplementation(record.id);
                }
              }}
            />
          </div>;
        }
      }]}
      rowKey="id"
    />
  </div>;
}

export const ImplementationDetail = ({ implementation, agentId, models, collections, skills, agents }:
  {
    implementation: IImplementation
    agentId: number,
    models: IModelConfig[],
    collections: ICollection[],
    skills: ISkill[],
    agents: IAgent[],
  }) => {

  const [data, setData] = React.useState<IImplementation>(implementation);

  const [descEditing, setDescEditing] = React.useState<boolean>(false);
  const [promptEditing, setPromptEditing] = React.useState<boolean>(false);

  return <div className="mb-2   relative">
    <div className="     rounded  ">
      <div className="flex mt-2 pb-2 mb-2 border-b">
        <div className="flex-1 font-semibold mb-2 ">
          <LeftOutlined onClick={() => {

          }} />
          {" "}
          <a>{data.name}</a>
        </div>
      </div>
      <Button>Test</Button>
    </div>
    <ControlRowView
      title="Description"
      className="mt-4"
      description=""
      value={""}
      control={
        <Input
          className="mt-2"
          placeholder="Please enter the description of the implementation"
          value={data.description}
          onChange={(e) => {
            setData({
              ...data,
              description: e.target.value
            });
          }}
          readOnly={!descEditing}
          suffix={!descEditing && <EditOutlined onClick={() => {
            setDescEditing(true);
          }}
            onBlur={() => {
              setDescEditing(false);
            }}
            onPressEnter={() => {
              setDescEditing(false);
            }}
          />}
        />
      }
    />
  </div>
};


export const AgentViewer = ({
  agent,
  setAgent,
  schemas,
  skills,
  models,
  collections,
  agents,
  close,
}: {
  agent: IAgent | null;
  setAgent: (newAgent: IAgent) => void;
  schemas: ISchema[];
  skills: ISkill[];
  collections: ICollection[];
  models: IModelConfig[];
  agents: IAgent[];
  close: () => void;
}) => {
  let items = [
    {
      label: (
        <div className="w-full  ">
          {" "}
          {/* <BugAntIcon className="h-4 w-4 inline-block mr-1" /> */}
          Configuration
        </div>
      ),
      key: "1",
      children: (
        <div>
          {!agent?.type && (
            <AgentTypeSelector agent={agent} setAgent={setAgent} />
          )}

          {agent?.type && agent && (
            <AgentConfigView agent={agent} setAgent={setAgent} schemas={schemas} skills={skills} close={close} />
          )}
        </div>
      ),
    },
  ];
  if (agent) {
    if (agent?.id) {

      items.push({
        label: <div className="w-full  ">
          {" "}
          Compile
        </div>,
        key: "compile",
        children: <AgentCompileView agentId={agent.id} agent={agent} models={models} collections={collections} skills={skills} agents={agents} />
      })

      // items.push({
      //   label: <div className="w-full  ">
      //     {" "}
      //     Implementation
      //   </div>,
      //   key: "implementations",
      //   children: <ImplementationView agentId={agent.id} models={models} collections={collections} skills={skills} agents={agents} />
      // })

      if (agent.type && agent.type === "groupchat") {
        items.push({
          label: (
            <div className="w-full  ">
              {" "}
              <UserGroupIcon className="h-4 w-4 inline-block mr-1" />
              Agents
            </div>
          ),
          key: "2",
          children: <AgentSelector agentId={agent?.id} />,
        });
      }

      items.push({
        label: (
          <div className="w-full  ">
            {" "}
            <CpuChipIcon className="h-4 w-4 inline-block mr-1" />
            Models
          </div>
        ),
        key: "3",
        children: <ModelSelector agentId={agent?.id} />,
      });

      items.push({
        label: (
          <>
            <BugAntIcon className="h-4 w-4 inline-block mr-1" />
            Skills
          </>
        ),
        key: "4",
        children: <SkillSelector agentId={agent?.id} />,
      });
    }
  }

  return (
    <div className="text-primary">
      {/* <RenderView viewIndex={currentViewIndex} /> */}
      <Tabs
        tabBarExtraContent={{
          left: <div className="mr-4"><LeftOutlined onClick={close} /> <a className="text-blue">Signature detail</a> </div>
        }}
        tabBarStyle={{ paddingLeft: 0, marginLeft: 0 }}
        defaultActiveKey="1"
        items={items}
      />
    </div>
  );
};
