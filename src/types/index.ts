// 核心类型定义

export interface PluginSettings {
  apiKey: string;
  provider: 'claude' | 'openai' | 'ollama';
  granularity: 'fine' | 'medium' | 'coarse';
  defaultFolder: string;
  keepOriginalNote: boolean;
  addBanner: boolean;
  // Ollama 专用配置
  ollamaBaseUrl: string;
  ollamaModel: string;
  // 自定义提示词
  customPrompt: string;
  useCustomPrompt: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  apiKey: '',
  provider: 'claude',
  granularity: 'medium',
  defaultFolder: '',
  keepOriginalNote: true,
  addBanner: true,
  ollamaBaseUrl: 'http://127.0.0.1:11434',
  ollamaModel: 'qwen2.5:32b',
  customPrompt: '',
  useCustomPrompt: false,
};

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
}

export interface Relation {
  logic: string;  // 逻辑词：如"因为"、"导致"、"对比"等
  concept: string; // 相关概念名称
}

export type CardTag =
  | '认知观念'
  | '方法工具'
  | '行动指南'
  | '资源列表'
  | '案例实战';

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
