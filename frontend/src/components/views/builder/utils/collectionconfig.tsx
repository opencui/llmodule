import React from "react";
import { fetchJSON, getServerUrl, sampleModelConfig } from "../../../utils";
import { Button, Input, Modal, Select, Switch, Table, message, theme } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import {
  CpuChipIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { ICollection, ICollectionRow, ISchema, ISchemaField, IStatus } from "../../../types";
import { Card, ControlRowView } from "../../../atoms";
import TextArea from "antd/es/input/TextArea";
import { appContext } from "../../../../hooks/provider";
import { cloneDeep } from "lodash";

const RowModal = ({
  value, fields = [], onSave, close
}: {
  value?: ICollectionRow;
  fields: ISchemaField[];
  onSave: (nextValue: ICollectionRow) => void;
  close: () => void;
}) => {

  const [data, setData] = React.useState<ICollectionRow>(value || {})

  React.useEffect(() => {
    if (value) {
      setData(cloneDeep(value));
    }
  }, [value])

  return <Modal
    title="Add a row"
    open={!!value}
    onOk={() => {
      onSave(data);
    }}
    onCancel={close}
  >
    {fields.map((field, index) => {

      let control: React.ReactNode = "";
      switch (field.true_type) {
        case 'boolean':
          control = <Switch key={index} checked={data.data && data.data[field.name] as boolean} onChange={(checked) => {
            setData({
              ...data,
              data: {
                ...data.data,
                [field.name]: checked
              }
            })
          }} />
          break;
        default:
          control = <Input
            key={index}
            className="mt-2 w-full"
            value={data.data && data.data[field.name]}
            placeholder="Please enter the value of the field"
            onChange={(e) => {
              setData({
                ...data,
                data: {
                  ...data.data,
                  [field.name]: e.target.value
                }
              });
            }}
          />
      }

      return <ControlRowView
        title={field.name}
        key={index}
        className="mt-4"
        description=""
        value={""}
        control={control}
      />;
    })
    }
  </Modal>
}

const CollectionConfigMainView = ({
  collection,
  setCollection,
  close,
}: {
  collection: ICollection;
  setCollection: (newModel: ICollection) => void;
  close: () => void;
}) => {
  const [loading, setLoading] = React.useState(false);
  const [collectionStatus, setModelStatus] = React.useState<IStatus | null>(null);
  const serverUrl = getServerUrl();
  const { user } = React.useContext(appContext);
  const testModelUrl = `${serverUrl}/models/test`;
  const createModelUrl = `${serverUrl}/models`;
  const listUrl = `${serverUrl}/collection_rows?collection_id=${collection.id}`;
  const saveRowUrl = `${serverUrl}/collection_rows?collection_id=${collection.id}`;
  const schemaUrl = `${serverUrl}/schemas?user_id=${user?.email}&schema_id=${collection.schema_id}`;
  const [schema, setSchema] = React.useState<ISchema | undefined>(undefined);
  const fetchData = () => {
    setLoading(true);
    const payLoad = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const onSuccess = (data: any) => {
      if (data && data.status) {
        // message.success(data.message);
        setData(data.data)
        setModelStatus(data.data);
      } else {
        message.error(data.message);
      }
      setLoading(false);
      setModelStatus(data);
    };
    const onError = (err: any) => {
      message.error(err.message);
      setLoading(false);
    };
    fetchJSON(listUrl, payLoad, onSuccess, onError);
  };

  const fetchSchema = () => {
    setLoading(true);
    const payLoad = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const onSuccess = (data: any) => {
      if (data && data.status) {
        // message.success(data.message);
        setSchema(data.data[0]);
        setModelStatus(data.data);
      } else {
        message.error(data.message);
      }
      setLoading(false);
      setModelStatus(data);
    };
    const onError = (err: any) => {
      message.error(err.message);
      setLoading(false);
    };
    fetchJSON(schemaUrl, payLoad, onSuccess, onError);
  };

  const saveRow = (row: ICollectionRow) => {
    setModelStatus(null);
    setLoading(true);
    const payLoad = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(row),
    };

    const onSuccess = (data: any) => {
      // console.log('on success:', data);
      if (data && data.status) {
        message.success(data.message);
        fetchData();
        setModelStatus(data.data);
      } else {
        message.error(data.message);
      }
      setLoading(false);
      setModelStatus(data);
    };
    const onError = (err: any) => {
      message.error(err.message);
      setLoading(false);
    };
    fetchJSON(saveRowUrl, payLoad, onSuccess, onError);
  };

  const deleteRow = (rowId: number) => {
    const deleteRowUrl = `${serverUrl}/collection_rows/delete?collection_id=${collection.id}&row_id=${rowId}`;
    setModelStatus(null);
    setLoading(true);
    const payLoad = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      }
    };

    const onSuccess = (data: any) => {
      if (data && data.status) {
        message.success(data.message);
        fetchData();
        setModelStatus(data.data);
      } else {
        message.error(data.message);
      }
      setLoading(false);
      setModelStatus(data);
    };
    const onError = (err: any) => {
      message.error(err.message);
      setLoading(false);
    };
    fetchJSON(deleteRowUrl, payLoad, onSuccess, onError);
  };

  const [controlChanged, setControlChanged] = React.useState<boolean>(false);

  const updateCollectionConfig = (key: string, value: any) => {
    if (collection) {
      const updatedCollectionConfig = { ...collection, [key]: value };
      setCollection(updatedCollectionConfig);
    }
    setControlChanged(true);
  };

  const hasChanged = !controlChanged && collection.id !== undefined;

  const [newRow, setNewRow] = React.useState<ICollectionRow | null>(null);
  const [selectedRow, setSelectedRow] = React.useState<ICollectionRow | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);
  const [data, setData] = React.useState<ICollectionRow[]>([]);

  React.useEffect(() => {
    fetchData();
    if (collection.schema_id) {
      fetchSchema();
      console.log(schema);
    }
  }, [collection])
  console.log("collection:", collection)
  console.log(schema);
  return (
    <div className="relative ">
      <RowModal
        value={newRow || selectedRow || undefined}
        fields={(schema && schema.fields || [])}
        onSave={(nextValue: ICollectionRow) => {
          if (nextValue) {
            saveRow(nextValue);
          }

          setNewRow(null);
          setSelectedRow(null);
          setSelectedIndex(-1);
        }}
        close={() => {
          setNewRow(null);
          setSelectedRow(null);
          setSelectedIndex(-1);
        }}
      />
      <ControlRowView
        title="Fields"
        className="mt-4"
        description="Fields of the collection"
        value={""}
        extra={<Button
          type="primary"
          onClick={() => {
            setNewRow({
              collection_id: collection.id!,
              data: {}
            });
          }}>Add</Button>}
        control={
          <Table
            dataSource={data}
            rowKey="id"
            onRow={(_, index) => {
              return {
                onClick: () => {
                  if (index !== undefined) {
                    setSelectedRow(data[index]);
                    setSelectedIndex(index);
                  }
                }
              };
            }}
            columns={[
              ...(
                (schema?.fields || []).map((field) => {

                  return {
                    title: field.name,
                    dataIndex: ["data", field.name]
                  }
                })
              ),
              {
                dataIndex: "",
                width: 50,
                render: (_, record, index) => {
                  return <div className="hover">
                    <DeleteOutlined
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (record.id) {
                          deleteRow(record.id);
                        }
                      }}
                    />
                  </div>;
                }
              }]}
          />
        }
      />

      {/*collectionStatus && (
        <div
          className={`text-sm border mt-4 rounded text-secondary p-2 ${collectionStatus.status ? "border-accent" : " border-red-500 "
            }`}
        >
          <InformationCircleIcon className="h-4 w-4 inline mr-1" />
          {collectionStatus.message}

          {/* <span className="block"> Note </span>}
        </div>
      ) */}

      <div className="w-full mt-4 text-right">

        {/* {!hasChanged && (
          <Button
            className="ml-2"
            key="save"
            type="primary"
            onClick={() => {
              if (collection) {
                createModel(collection);
                setCollection(collection);
              }
            }}
          >
            {collection?.id ? "Save" : "Create"}
          </Button>
        )} */}

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

export const CollectionConfigView = ({
  collection,
  setCollection,
  close,
}: {
  collection: ICollection;
  setCollection: (newCollection: ICollection) => void;
  close: () => void;
}) => {
  return (
    <div className="text-primary">
      <div>
        <CollectionConfigMainView
          collection={collection}
          setCollection={setCollection}
          close={close}
        />
      </div>
    </div>
  );
};
