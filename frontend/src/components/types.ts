export type NotificationType = "success" | "info" | "warning" | "error";

export interface IMessage {
  user_id: string;
  role: string;
  content: string;
  created_at?: string;
  updated_at?: string;
  session_id?: number;
  connection_id?: string;
  workflow_id?: number;
}

export interface IStatus {
  message: string;
  status: boolean;
  data?: any;
}

export interface IChatMessage {
  text: string;
  sender: "user" | "bot";
  meta?: any;
  msg_id: string;
}

export interface ILLMConfig {
  config_list: Array<IModelConfig>;
  timeout?: number;
  cache_seed?: number | null;
  temperature: number;
  max_tokens: number;
}

export interface IAgentConfig {
  name: string;
  llm_config?: ILLMConfig | false;
  human_input_mode: string;
  max_consecutive_auto_reply: number;
  system_message: string | "";
  is_termination_msg?: boolean | string;
  default_auto_reply?: string | null;
  code_execution_config?: "none" | "local" | "docker";
  description?: string;

  admin_name?: string;
  messages?: Array<IMessage>;
  max_round?: number;
  speaker_selection_method?: string;
  allow_repeat_speaker?: boolean;

}

export interface IAgent {
  type?: "assistant" | "userproxy" | "groupchat";
  config: IAgentConfig;
  created_at?: string;
  updated_at?: string;
  id?: number;
  skills?: Array<ISkill>;
  user_id?: string;

  // new fields
  schema_id?: ISchema;
  functions?: Array<ISkill>;
}

export interface IWorkflow {
  name: string;
  description: string;
  sender: IAgent;
  receiver: IAgent;
  type: "twoagents" | "groupchat";
  created_at?: string;
  updated_at?: string;
  summary_method?: "none" | "last" | "llm";
  id?: number;
  user_id?: string;
}

export interface IModelConfig {
  model: string;
  api_key?: string;
  api_version?: string;
  base_url?: string;
  api_type?: "open_ai" | "azure" | "google";
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
  id?: number;
}

export interface ISchemaField {
  name: string;
  description?: string;
  true_type: 'any' | 'int' | 'float' | 'boolean' | 'string';  // default 为 'any'
  mode: 'any' | 'input' | 'output'; // default 为 any
  prefix: string;
}

export interface ISchema {
  id?: number;  // 主键，跟随后端数据库使用的主键类型
  created_at?: string;
  updated_at?: string;
  user_id?: string; // user.email
  name: string;
  description: string;
  fields: ISchemaField[];
}

export interface ICollection {
  id?: number;  // 主键，跟随后端数据库使用的主键类型
  name: string;
  description: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string; // user.email
  schema_id?: string;
  table_name?: string; //不确定需不需要，如果需要应由后端生成确保唯一性，对应具体collection的table name
}

export interface ICollectionRow {
  id?: number;  // 主键，跟随后端数据库使用的主键类型
  collection_id: number;
  data: {
    [key: string]: any
  }
}

export interface IMetadataFile {
  name: string;
  path: string;
  extension: string;
  content: string;
  type: string;
}

export interface IChatSession {
  id?: number;
  user_id: string;
  workflow_id?: number;
  created_at?: string;
  updated_at?: string;
  name: string;
}

export interface IGalleryItem {
  id: number;
  messages: Array<IMessage>;
  session: IChatSession;
  tags: Array<string>;
  created_at: string;
  updated_at: string;
}

export interface ISkill {
  name: string;
  content: string;
  id?: number;
  description?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ISignatureCompileRequest {
  agent_id?: number;
  models: (IModelConfig| null)[];
  training_sets: ICollection[];
  development_sets: ICollection[];
  prompt_strategy?: 'Predict' | 'ChainOfThought' | 'ReAct';
  optimizer?: 'LabeledFewShot' | 'BootstrapFewShot' | 'BootstrapFewShotWithRandomSearch' | 'BootstrapFewShotWithOptuna' | 'KNNFewShot';
  metric_id?: number;
  metric_type?: 'skill' | 'agent';

  implementation_name: string;
  implementation_description: string;
}

export interface IImplementation {
  agent_id?: number;
  name: string;
  id?: number;
  description?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;

  generated_prompt?: string;
}

export interface IEvaluation {
  agent_id?: number;
  implementation_id?: number;
  id?: number;
  collection?: ICollection;
  metric?: ISkill | IAgent;

  result?: { [key: string]: string }[];
}

export interface IImplementationTestRequest {
  implementation_id: number;
  inputs: { [key: string]: any };
}

export interface IImplementationTestResponse {
  result: { [key: string]: any };
}


