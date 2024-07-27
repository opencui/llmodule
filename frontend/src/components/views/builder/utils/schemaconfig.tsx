import React from "react";
import { fetchJSON, getServerUrl, sampleModelConfig } from "../../../utils";
import { Button, Input, Modal, Select, Table, message, theme } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import {
  CpuChipIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { ISchema, ISchemaField, IStatus } from "../../../types";
import { Card, ControlRowView } from "../../../atoms";
import TextArea from "antd/es/input/TextArea";
import { appContext } from "../../../../hooks/provider";
import { cloneDeep } from "lodash";

const FieldModal = ({
  value, onSave, close
}: {
  value?: ISchemaField;
  onSave: (nextValue: ISchemaField) => void;
  close: () => void;
}) => {

  const [data, setData] = React.useState<ISchemaField>({
    name: "",
    description: "",
    true_type: "any",
    mode: "any",
    prefix: ""
  })

  React.useEffect(() => {
    if (value) {
      setData(cloneDeep(value));
    }
  }, [value])

  return <Modal
    title="Add a field"
    open={!!value}
    onOk={() => {
      if (!data.name) {
        message.warning('Name is required');
        return;
      }

      onSave(data);
    }}
    onCancel={close}
  >
    <ControlRowView
      title="Name"
      className="mt-4"
      description=""
      value={""}
      control={
        <Input
          className="mt-2 w-full"
          value={data?.name}
          placeholder="Please enter the name of the field"
          onChange={(e) => {
            setData({
              ...data, name: e.target.value
            });
          }}
        />
      }
    />

    <ControlRowView
      title="Description"
      className="mt-4"
      description="Description of the field"
      value={""}
      control={
        <TextArea
          className="mt-2 w-full"
          value={data?.description}
          placeholder="Please enter the description of the field"
          onChange={(e) => {
            setData({
              ...data, description: e.target.value
            });
          }}
        />
      }
    />

    <ControlRowView
      title="True type"
      className="mt-4"
      description=""
      value={""}
      titleExtra={
        <Select value={data.true_type} onChange={(v) => {
          setData({
            ...data, true_type: v
          });
        }}>
          <Select.Option key="any" value="any">Don't care</Select.Option>
          <Select.Option key="int" value="int">Int</Select.Option>
          <Select.Option key="float" value="float">Float</Select.Option>
          <Select.Option key="boolean" value="boolean">Boolean</Select.Option>
          <Select.Option key="string" value="string">String</Select.Option>
        </Select>
      }
      control={""}
    />

    <ControlRowView
      title="Mode"
      className="mt-4"
      description=""
      value={""}
      titleExtra={
        <Select value={data.mode} onChange={(v) => {
          setData({
            ...data, mode: v
          });
        }}>
          <Select.Option key="any" value="any">Don't care</Select.Option>
          <Select.Option key="input" value="input">Input</Select.Option>
          <Select.Option key="output" value="output">Output</Select.Option>
        </Select>
      }
      control={""}
    />
    <ControlRowView
      title="Prefix"
      className="mt-4"
      description="Prefix of the field"
      value={""}
      control={
        <TextArea
          className="mt-2 w-full"
          value={data?.prefix}
          placeholder="Please enter the prefix of the field"
          onChange={(e) => {
            setData({
              ...data, prefix: e.target.value
            });
          }}
        />
      }
    />
  </Modal>
}

const SchemaConfigMainView = ({
  schema,
  setSchema,
  close,
}: {
  schema: ISchema;
  setSchema: (newModel: ISchema) => void;
  close: () => void;
}) => {
  const [loading, setLoading] = React.useState(false);
  const [schemaStatus, setSchemaStatus] = React.useState<IStatus | null>(null);

  const [schemaConfig, setSchemaConfig] = React.useState<ISchema>(schema);

  const [controlChanged, setControlChanged] = React.useState<boolean>(false);

  const updateSchemaConfig = (key: string, value: any) => {
    setSchemaConfig({
      ...schemaConfig,
      [key]: value
    });
    setControlChanged(true);
  };

  const hasChanged = !controlChanged && schema.id !== undefined;

  const [newField, setNewField] = React.useState<ISchemaField | null>(null);
  const [selectedField, setSelectedField] = React.useState<ISchemaField | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);

  return (
    <div className="relative ">
      <FieldModal
        value={newField || selectedField || undefined}
        onSave={(nextValue: ISchemaField) => {
          if (newField) {

            updateSchemaConfig('fields', [
              ...schemaConfig.fields,
              nextValue
            ]);
          } else if (selectedField && selectedIndex !== -1) {
            const nextFields = cloneDeep(schemaConfig.fields);
            nextFields[selectedIndex] = nextValue;
            updateSchemaConfig('fields', nextFields);
          }

          setNewField(null);
          setSelectedField(null);
          setSelectedIndex(-1);
        }}
        close={() => {
          setNewField(null);
          setSelectedField(null);
          setSelectedIndex(-1);
        }}
      />
      <ControlRowView
        title="Name"
        className="mt-4"
        description="Name of the schema"
        value={""}
        control={
          <Input
            className="mt-2 w-full"
            value={schemaConfig.name}
            placeholder="Please enter the name of the schema"
            onChange={(e) => {
              updateSchemaConfig("name", e.target.value);
            }}
          />
        }
      />

      <ControlRowView
        title="Description"
        className="mt-4"
        description="Description of the schema"
        value={""}
        control={
          <TextArea
            className="mt-2 w-full"
            placeholder="Please enter the description of the schema"
            value={schemaConfig.description}
            onChange={(e) => {
              updateSchemaConfig("description", e.target.value);
            }}
          />
        }
      />

      <ControlRowView
        title="Fields"
        className="mt-4"
        description="Fields of the schema"
        value={""}
        extra={<Button
          type="primary"
          onClick={() => {
            setNewField({
              name: "",
              description: "",
              true_type: "any",
              mode: "any"
            });
          }}>Add</Button>}
        control={
          <Table
            dataSource={schemaConfig.fields}
            onRow={(_, index) => {
              return {
                onClick: () => {
                  if (index !== undefined) {
                    setSelectedField(schemaConfig.fields[index]);
                    setSelectedIndex(index);
                  }
                }
              };
            }}
            columns={[{
              title: "Name",
              key: "name",
              dataIndex: "name",
              width: 100,
            }, {
              title: "Description",
              key: "description",
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
                      const nextFields = cloneDeep(schemaConfig.fields);
                      nextFields.splice(index, 1);
                      updateSchemaConfig("fields", nextFields);
                    }}
                  />
                </div>;
              }
            }]}
          />
        }
      />

      {schemaStatus && (
        <div
          className={`text-sm border mt-4 rounded text-secondary p-2 ${schemaStatus.status ? "border-accent" : " border-red-500 "
            }`}
        >
          <InformationCircleIcon className="h-4 w-4 inline mr-1" />
          {schemaStatus.message}

          {/* <span className="block"> Note </span> */}
        </div>
      )}

      <div className="w-full mt-4 text-right">

        {!hasChanged && (
          <Button
            className="ml-2"
            key="save"
            type="primary"
            onClick={() => {
              if (schemaConfig) {

                if (!schemaConfig.name) {
                  message.warning("name is required");
                  return;
                }

                if (!schemaConfig.fields || !schemaConfig.fields.length) {
                  message.warning("at least one field is required");
                  return;
                }

                setSchema(schemaConfig);
              }
            }}
          >
            {schema?.id ? "Save" : "Create"}
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

export const SchemaConfigView = ({
  schema,
  setSchema,
  close,
}: {
  schema: ISchema;
  setSchema: (newSchema: ISchema) => void;
  close: () => void;
}) => {
  return (
    <div className="text-primary">
      <div>
        <SchemaConfigMainView
          schema={schema}
          setSchema={setSchema}
          close={close}
        />
      </div>
    </div>
  );
};
