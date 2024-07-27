import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
  PlusIcon,
  TrashIcon
} from "@heroicons/react/24/outline";
import { Button, Dropdown, GetProp, Input, MenuProps, Modal, Select, Switch, Upload, UploadFile, UploadProps, message } from "antd";
import { LeftOutlined, UploadOutlined } from "@ant-design/icons";
import * as React from "react";
import { ICollection, ISchema, IStatus } from "../../types";
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
import { CollectionConfigView } from "./utils/collectionconfig";
import { create } from "domain";
import { createConnection } from "net";

const CollectionsView = ({ }: any) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<IStatus | null>({
    status: true,
    message: "All good",
  });

  const { user } = React.useContext(appContext);
  const serverUrl = getServerUrl();
  const listSchemasUrl = `${serverUrl}/schemas?user_id=${user?.email}`;
  const listCollectionsUrl = `${serverUrl}/collections?user_id=${user?.email}`;
  const saveCollectionUrl = `${serverUrl}/collections?`;

  // const testModelUrl = `${serverUrl}/models/test`;

  const defaultCollection: ICollection = {
    user_id: user?.email,
    name: '',
    description: ''
  };

  const testCollections: ICollection[] = [{
    user_id: user?.email,
    id: 123,
    name: 'collection1',
    description: 'collection desc1'
  }]

  const [schemas, setSchemas] = React.useState<ISchema[] | null>([]);
  const [collections, setCollections] = React.useState<ICollection[] | null>([]);
  const [selectedCollection, setSelectedCollection] = React.useState<ICollection | null>(
    null
  );
  const [newCollection, setNewCollection] = React.useState<ICollection | null>(
  );

  const [showNewCollectionDetail, setShowNewCollectionDetail] = React.useState(false);
  const [showCollectionDetail, setShowCollectionDetail] = React.useState(false);

  const deleteCollection = (collection: ICollection) => {
    setError(null);
    setLoading(true);
    const deleteCollectionUrl = `${serverUrl}/collections/delete?user_id=${user?.email}&collection_id=${collection.id}`;
    const payLoad = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const onSuccess = (data: any) => {
      if (data && data.status) {
        message.success(data.message);
        fetchCollections();
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
    fetchJSON(deleteCollectionUrl, payLoad, onSuccess, onError);
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

  const fetchCollections = () => {
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
        setCollections(data.data);
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
    fetchJSON(listCollectionsUrl, payLoad, onSuccess, onError);
  };

  const saveCollection = (collection: ICollection, callback?: (nextCollection: ICollection) => void) => {
    setError(null);
    setLoading(true);
    collection.user_id = user?.email;

    const payLoad = {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(collection),
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
    fetchJSON(saveCollectionUrl, payLoad, onSuccess, onError);
  };

  React.useEffect(() => {
    if (user) {
      // console.log("fetching messages", messages);
      fetchSchemas();
      fetchCollections();
      // setCollections(testCollections);
    }
  }, []);

  const collectionRows = (collections || []).map((collection: ICollection, i: number) => {
    const cardItems = [
      {
        title: "Delete",
        icon: TrashIcon,
        onClick: (e: any) => {
          e.stopPropagation();
          deleteCollection(collection);
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
            <div className="  ">{truncateText(collection.name || "", 20)}</div>
          }
          onClick={() => {
            setSelectedCollection(collection);
            setShowCollectionDetail(true);
          }}
        >
          <div style={{ minHeight: "65px" }} className="my-2   break-words">
            {" "}
            {truncateText(collection.description || "", 70)}
          </div>
          <div
            aria-label={`Updated ${timeAgo(collection.updated_at || "")} `}
            className="text-xs"
          >
            {timeAgo(collection.updated_at || "")}
          </div>
          <CardHoverBar items={cardItems} />
        </Card>
      </li>
    );
  });

  const CollectionDetail = ({
    collection,
    setCollection,
    showCollectionDetail,
    setShowCollectionDetail,
    handler,
  }: {
    collection: ICollection;
    setCollection: (model: ICollection | null) => void;
    showCollectionDetail: boolean;
    setShowCollectionDetail: (show: boolean) => void;
    handler?: (agent: ICollection) => void;
  }) => {
    const [localCollection, setLocalCollection] = React.useState<ICollection>(collection);

    const closeDetail = () => {
      setCollection(null);
      setShowCollectionDetail(false);
      if (handler) {
        handler(collection);
      }
    };

    return (
      <div className="mb-2   relative">
        <div className="     rounded  ">
          <div className="flex mt-2 pb-2 mb-2 border-b">
            <div className="flex-1 font-semibold mb-2 ">
              <LeftOutlined onClick={() => {
                setShowCollectionDetail(false);
                setSelectedCollection(null);
                setShowNewCollectionDetail(false);
                fetchCollections();
              }} />
              {" "}
              Collection detail
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
            localCollection &&
            <CollectionConfigView
              collection={localCollection}
              setCollection={(nextCollection) => {

                saveCollection(nextCollection, (returnedCollection) => {
                  setLocalCollection(returnedCollection);
                })
              }}
              close={closeDetail}
            />
          }

        </div>
      </div>
    );
  };

  const [showCreateModal, setShowCreateModal] = React.useState<boolean>(false);
  const [createData, setCreateData] = React.useState<ICollection>(defaultCollection);
  const [createWithSchema, setCreateWithSchema] = React.useState<boolean>(true);

  const [fileList, setFileList] = React.useState<UploadFile[]>([]);

  const handleUpload = () => {
    const formData = new FormData();
    type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];
    fileList.forEach((file) => {
      formData.append('files[]', file as FileType);
    });
    formData.append("user_id", createData?.user_id || "");
    formData.append("name", createData?.name || "");
    formData.append("description", createData?.description || "");
    setLoading(true);

    const payLoad = {
      method: "POST",
      body: formData,
    };

    const onSuccess = (data: any) => {
      if (data && data.status) {
        message.success(data.message);
        setShowCreateModal(false);
        setSelectedCollection(data.data);
        setShowCollectionDetail(true);
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
    fetchJSON(`${saveCollectionUrl}&with_csv=true`, payLoad, onSuccess, onError);
  };

  const uploadProps: UploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      setFileList([...fileList, file]);

      return false;
    },
    fileList,
  };

  return (
    <div className="text-primary  ">
      {
        <Modal
          title="Create a new collection"
          open={showCreateModal}
          onOk={() => {
            if (!createData.name) {
              message.warning('name is required');
              return;
            }

            if (createWithSchema) {

              if (!createData.schema_id) {
                message.warning('please select a schema');
                return;
              }

              saveCollection(createData, (nextCollection) => {
                setShowCreateModal(false);
                setSelectedCollection(nextCollection);
                setShowCollectionDetail(true);
              });
            } else {
              handleUpload();
            }
          }}
          onCancel={() => {
            setShowCreateModal(false);
          }}
        >
          <ControlRowView
            title="Name"
            className="mt-4"
            description="Name of the collection"
            value={""}
            control={
              <Input
                className="mt-2 w-full"
                value={createData.name}
                placeholder="Please enter the name of the collection"
                onChange={(e) => {
                  setCreateData({
                    ...createData,
                    name: e.target.value
                  });
                }}
              />
            }
          />
          <ControlRowView
            title="Description"
            className="mt-4"
            description="Description of the collection"
            value={""}
            control={
              <Input
                className="mt-2 w-full"
                value={createData.description}
                placeholder="Please enter the decription of the collection"
                onChange={(e) => {
                  setCreateData({
                    ...createData,
                    description: e.target.value
                  });
                }}
              />
            }
          />
          <ControlRowView
            title="With schema"
            className="mt-4"
            description=""
            value={""}
            titleExtra={
              <Switch checked={createWithSchema} onChange={(checked) => {
                setCreateWithSchema(checked);
              }} />
            }
            control={""}
          />
          {
            createWithSchema ?
              <ControlRowView
                title="Schema"
                className="mt-4"
                description="Name of the collection"
                value={""}
                control={
                  <Select
                    className="w-full"
                    value={createData.schema_id}
                    placeholder="Please select a schema"
                    onChange={(value) => {
                      setCreateData({
                        ...createData,
                        schema_id: value
                      });
                    }}>
                    {schemas?.map((item: ISchema) => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}
                  </Select>
                }
              />
              : <Upload className="w-full" {...uploadProps} accept=".csv">
                <Button icon={<UploadOutlined />}>Click here or drag a CSV file into this area to upload it</Button>
              </Upload>
          }
        </Modal>
      }
      {selectedCollection && (
        <CollectionDetail
          collection={selectedCollection}
          setCollection={setSelectedCollection}
          setShowCollectionDetail={setShowCollectionDetail}
          showCollectionDetail={showCollectionDetail}
          handler={(model: ICollection | null) => {
            fetchCollections();
          }}
        />
      )}
      {!showCollectionDetail && !showNewCollectionDetail &&
        <div className="mb-2   relative">
          <div className="     rounded  ">
            <div className="flex mt-2 pb-2 mb-2 border-b">
              <div className="flex-1 font-semibold mb-2 ">
                {" "}
                Collections ({collectionRows.length}){" "}
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
                    setCreateData(defaultCollection);
                    setShowCreateModal(true)
                  }}
                >
                  <PlusIcon className="w-5 h-5 inline-block mr-1" />
                  New Collection
                </Button>
              </div>
            </div>

            <div className="text-xs mb-2 pb-1  ">
              {" "}
              Collections define the format of the data in a dataset.
              {/* {selectedCollection?.model} */}
            </div>
            {collections && collections.length > 0 && (
              <div className="w-full  relative">
                <LoadingOverlay loading={loading} />
                <ul className="   flex flex-wrap gap-3">{collectionRows}</ul>
              </div>
            )}

            {collections && collections.length === 0 && !loading && (
              <div className="text-sm border mt-4 rounded text-secondary p-2">
                <InformationCircleIcon className="h-4 w-4 inline mr-1" />
                No collection found. Please create a new collection which can be reused
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

export default CollectionsView;
