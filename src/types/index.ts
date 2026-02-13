export interface PluginSettings {
  // API Configuration
  apiKey: string;
  provider: 'claude' | 'openai' | 'ollama' | 'custom';
  ollamaBaseUrl: string;
  ollamaModel: string;
  openaiModel?: string;

  // Decomposition Settings
  granularity: 'fine' | 'medium' | 'coarse';
  defaultFolder: string;
  inheritTags: boolean;
  addAtomicTag: boolean;
  customTags: string;

  // Original Note Handling
  keepOriginalNote: boolean;
  addBanner: boolean;
  archiveOriginal: boolean;
  archiveFolder: string;
  addDecomposedTag: boolean;

  // Advanced Options
  minNoteLength: number;
  undoHistoryDays: number;
  smartTags: boolean;

  // Templates
  templates: PromptTemplate[];
  activeTemplateId: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  systemPrompt: string;
  userPrompt: string;
  isDefault?: boolean;
}

export interface AtomicCard {
  title: string;
  description: string;
  tags: CardTag[];
  content: string;
  explanation: string;
  relations: Relation[];
  position: {
    parent?: string;
    children?: string[];
  };
  // UI State
  selected?: boolean;
}

export interface Relation {
  logic: string;
  concept: string;
}

export type CardTag =
  | '认知观念'
  | '方法工具'
  | '行动指南'
  | '资源列表'
  | '案例实战'
  | string; // Allow custom tags

export interface DecompositionResult {
  cards: AtomicCard[];
  summary: string;
  estimatedCount: number;
}

export interface LLMResponse {
  success: boolean;
  data?: DecompositionResult;
  error?: string;
}

// LLM API Types
export interface ClaudeContent {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContent[];
}

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  system?: string;
  temperature?: number;
}

export interface OpenAIContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAIContent[];
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
}


const STANDARD_TEMPLATE: PromptTemplate = {
  id: 'standard',
  name: 'Standard (标准)',
  isDefault: true,
  systemPrompt: '你是笔记拆解专家。',
  userPrompt: `请将以下笔记内容拆解为原子化知识卡片。

**笔记内容**：
{{content}}

**参考现有标签（优先使用）**：
{{tags}}

**输出要求**：
请以 JSON 格式输出，包含 cards 数组，每个卡片包含：
- title: 卡片标题（简短精炼，不含特殊字符）
- description: 50字内中文简述核心
- tags: 从以下5种类型中选择一个：["认知观念", "方法工具", "行动指南", "资源列表", "案例实战"]。
- content: 重写后的原子化内容（清晰、独立、可复用的一段内容）
- explanation: 简述笔记类型、来源上下文或使用场景
- relations: 概念间逻辑关系，包含 logic（如：前置、支撑、反对、包含）和 concept（目标概念名）
- position: { parent: "向上追溯的上位概念/MOC", children: ["向下拆解的下位概念/案例"] }

请直接输出 JSON，不要添加任何其他文字。`
};

const MEETING_TEMPLATE: PromptTemplate = {
  id: 'meeting',
  name: 'Meeting (会议)',
  isDefault: false,
  systemPrompt: '你是会议纪要专家。擅长从混乱的对话中提取关键决策和待办事项。',
  userPrompt: `请分析以下会议记录，提取关键信息生成原子卡片。

**会议内容**：
{{content}}

**输出要求**：
请以 JSON 格式输出，包含 cards 数组。每一张卡片代表一个"决策"或"待办事项" (Action Item)。
- title: 决策/任务简述
- description: 负责人或截止日期
- tags: ["行动指南", "案例实战"]
- content: 详细描述
- explanation: 上下文背景
- relations: []
- position: {}

请直接输出 JSON，不要添加任何其他文字。`
};

const CONCEPT_TEMPLATE: PromptTemplate = {
  id: 'concept',
  name: 'Concept (概念)',
  isDefault: false,
  systemPrompt: '你是费曼学习法大师。你能用最通俗易懂的语言解释复杂概念。',
  userPrompt: `请用"像我 5 岁" (ELI5) 的风格解释以下概念。

**内容**：
{{content}}

**输出要求**：
请以 JSON 格式输出，包含 cards 数组。
- title: 核心概念名称
- description: 一句话通俗解释
- tags: ["认知观念"]
- content: 费曼风格的解释，使用比喻
- explanation: 原理说明
- relations: []
- position: {}

请直接输出 JSON，不要添加任何其他文字。`
};

export const DEFAULT_SETTINGS: PluginSettings = {
  apiKey: '',
  provider: 'claude',
  ollamaBaseUrl: 'http://127.0.0.1:11434',
  ollamaModel: 'qwen2.5:32b',
  openaiModel: 'gpt-4o',

  granularity: 'medium',
  defaultFolder: '',
  inheritTags: true,
  addAtomicTag: true,
  customTags: '',

  keepOriginalNote: true,
  addBanner: true,
  archiveOriginal: false,
  archiveFolder: 'Archive',
  addDecomposedTag: false,

  minNoteLength: 50,
  undoHistoryDays: 30,
  smartTags: true,

  templates: [STANDARD_TEMPLATE, MEETING_TEMPLATE, CONCEPT_TEMPLATE],
  activeTemplateId: 'standard'
};
