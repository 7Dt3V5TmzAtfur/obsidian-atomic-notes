import { DecompositionResult, LLMResponse, PluginSettings } from '../types';
import { requestUrl } from 'obsidian';

export class LLMService {
  private settings: PluginSettings;

  constructor(settings: PluginSettings) {
    this.settings = settings;
  }

  async decompose(noteContent: string): Promise<LLMResponse> {
    // Ollama 不一定需要 API Key
    if (this.settings.provider !== 'ollama' && !this.settings.apiKey) {
      return {
        success: false,
        error: '请先在设置中配置 API Key',
      };
    }

    try {
      const prompt = this.buildPrompt(noteContent);

      // 根据不同 Provider 调用不同 API
      let responseText: string;

      if (this.settings.provider === 'claude') {
        responseText = await this.callClaude(prompt);
      } else if (this.settings.provider === 'ollama') {
        responseText = await this.callOllama(prompt);
      } else {
        return {
          success: false,
          error: `暂不支持 Provider: ${this.settings.provider}`,
        };
      }

      const result = this.parseResponse(responseText);

      return {
        success: true,
        data: result,
      };

    } catch (error) {
      console.error('LLM API 调用失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  private async callClaude(prompt: string): Promise<string> {
    const response = await requestUrl({
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.settings.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    });

    const data = response.json;
    return data.content[0]?.text || '';
  }

  private async callOllama(prompt: string): Promise<string> {
    const baseUrl = this.settings.ollamaBaseUrl || 'http://127.0.0.1:11434';
    const model = this.settings.ollamaModel || 'qwen2.5:32b';

    // Ollama 使用 OpenAI 兼容的 API
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 如果配置了 API Key，添加到请求头
    if (this.settings.apiKey) {
      headers['Authorization'] = `Bearer ${this.settings.apiKey}`;
    }

    const response = await requestUrl({
      url: `${baseUrl}/v1/chat/completions`,
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model,
        messages: [{
          role: 'user',
          content: prompt,
        }],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    const data = response.json;
    return data.choices?.[0]?.message?.content || '';
  }

  private buildPrompt(noteContent: string): string {
    const granularityHint = {
      fine: '尽可能拆分为更多的小卡片（8-12个）',
      medium: '拆分为适中数量的卡片（5-8个）',
      coarse: '只拆分出核心概念（3-5个）',
    };

    return `你是笔记拆解专家。请将以下笔记内容拆解为原子化知识卡片。

**拆解粒度**：${granularityHint[this.settings.granularity]}

**笔记内容**：
${noteContent}

**输出要求**：
请以 JSON 格式输出，包含 cards 数组，每个卡片包含：
- title: 卡片标题（简短精炼）
- description: 50字内中文简述核心
- tags: 从以下5种类型中选择一个：["认知观念", "方法工具", "行动指南", "资源列表", "案例实战"]
- content: 重写后的原子化内容（清晰、独立、可复用）
- explanation: 简述笔记类型和上下文
- relations: 相关概念列表（2-4个，仅使用可能已存在的笔记名称）
- position: { parent: "向上追溯的MOC", children: ["向下拆解的案例"] }

示例输出：
{
  "cards": [
    {
      "title": "可供性",
      "description": "物体特征自然暗示其使用方式，无需说明",
      "tags": ["认知观念"],
      "content": "可供性（Affordance）是指物体本身传达的行为暗示...",
      "explanation": "核心设计概念，来源于认知心理学",
      "relations": ["Don Norman", "设计心理学", "用户体验"],
      "position": {
        "parent": "UX设计MOC",
        "children": ["电梯按钮案例", "门把手设计"]
      }
    }
  ]
}

请直接输出 JSON，不要添加任何其他文字。`;
  }

  private parseResponse(responseText: string): DecompositionResult {
    try {
      // 尝试提取 JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法解析 LLM 响应');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        cards: parsed.cards || [],
        summary: `成功拆解为 ${parsed.cards?.length || 0} 张卡片`,
        estimatedCount: parsed.cards?.length || 0,
      };
    } catch (error) {
      console.error('解析响应失败:', error);
      return {
        cards: [],
        summary: '解析失败',
        estimatedCount: 0,
      };
    }
  }
}
