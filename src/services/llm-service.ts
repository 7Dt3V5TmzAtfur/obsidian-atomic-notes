import { PluginSettings, DecompositionResult, LLMResponse, PromptTemplate, ClaudeMessage, ClaudeContent, ClaudeRequest, OpenAIMessage, OpenAIContent, OpenAIRequest, AtomicCard, CardTag } from '../types';
import { requestUrl } from 'obsidian';

const DEFAULT_CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

export class LLMService {
  private settings: PluginSettings;

  constructor(settings: PluginSettings) {
    this.settings = settings;
  }

  async testConnection(): Promise<boolean> {
    try {
        console.log('Testing connection for provider:', this.settings.provider);
        if (this.settings.provider === 'claude') {
            await this.callClaude('', 'Hello', 10);
        } else {
            await this.callOpenAICompatible('', 'Hello', 10);
        }
        return true;
    } catch (e) {
        console.error('Test connection failed:', e);
        return false;
    }
  }

  async decompose(noteContent: string, noteTitle: string = '', availableTags: string[] = [], images: string[] = []): Promise<LLMResponse> {
    // Only check API Key if strictly required
    const isKeyRequired = this.settings.provider === 'claude' || this.settings.provider === 'openai';
    if (isKeyRequired && !this.settings.apiKey) {
      return {
        success: false,
        error: '请先在设置中配置 API Key',
      };
    }

    try {
      const template = this.settings.templates.find(t => t.id === this.settings.activeTemplateId) || this.settings.templates[0];
      const { systemPrompt, userPrompt } = this.buildPrompts(template, noteContent, noteTitle, availableTags);

      let responseText: string;

      if (this.settings.provider === 'claude') {
        responseText = await this.callClaude(systemPrompt, userPrompt, 4096, images);
      } else {
        // OpenAI, Ollama, Custom all share this path
        responseText = await this.callOpenAICompatible(systemPrompt, userPrompt, 4096, images);
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

  private buildPrompts(template: PromptTemplate, content: string, title: string, tags: string[]): { systemPrompt: string, userPrompt: string } {
    const tagsString = tags.length > 0 ? tags.join(', ') : '(无)';
    const replaceVars = (str: string) => {
      return str
        .replace(/{{content}}/g, content)
        .replace(/{{title}}/g, title)
        .replace(/{{tags}}/g, tagsString)
        .replace(/{noteContent}/g, content)
        .replace(/{granularity}/g, this.settings.granularity);
    };

    return {
      systemPrompt: template.systemPrompt || '',
      userPrompt: replaceVars(template.userPrompt)
    };
  }

  private async callClaude(systemPrompt: string, userPrompt: string, maxTokens: number = 4096, images: string[] = []): Promise<string> {
    let messages: ClaudeMessage[];

    if (images.length > 0) {
        const content: ClaudeContent[] = [];
        // Text first
        content.push({ type: 'text', text: userPrompt });

        // Then images
        for (const img of images) {
            const matches = img.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                content.push({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: matches[1],
                        data: matches[2]
                    }
                });
            }
        }
        messages = [{ role: 'user', content }];
    } else {
        messages = [{ role: 'user', content: userPrompt }];
    }

    const body: ClaudeRequest = {
      model: DEFAULT_CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages: messages,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const response = await requestUrl({
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.settings.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = response.json;
    return data.content[0]?.text || '';
  }

  private async callOpenAICompatible(systemPrompt: string, userPrompt: string, maxTokens: number = 4096, images: string[] = []): Promise<string> {
    // 1. Determine Endpoint
    let endpoint = '';

    if (this.settings.provider === 'openai') {
        endpoint = 'https://api.openai.com/v1/chat/completions';
    } else if (this.settings.provider === 'ollama') {
        const baseUrl = this.settings.ollamaBaseUrl || 'http://127.0.0.1:11434';
        endpoint = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
    } else {
        // Custom
        const baseUrl = this.settings.ollamaBaseUrl; // Reuse field for custom URL
        if (!baseUrl) throw new Error('Base URL is required for Custom provider');
        // If user provided full URL ending in /chat/completions, use it, otherwise append
        if (baseUrl.endsWith('/chat/completions')) {
            endpoint = baseUrl;
        } else {
            endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
        }
    }

    // 2. Determine Model
    let model = '';
    if (this.settings.provider === 'openai') {
        model = this.settings.openaiModel || 'gpt-4o';
    } else {
        model = this.settings.ollamaModel || 'qwen2.5:32b';
    }

    // 3. Prepare Request
    const messages: OpenAIMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    if (images.length > 0) {
        const content: OpenAIContent[] = [{ type: 'text', text: userPrompt }];
        for (const img of images) {
            content.push({
                type: 'image_url',
                image_url: {
                    url: img
                }
            });
        }
        messages.push({ role: 'user', content });
    } else {
        messages.push({ role: 'user', content: userPrompt });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.settings.apiKey) {
      headers['Authorization'] = `Bearer ${this.settings.apiKey}`;
    }

    console.log(`Calling LLM: ${endpoint} (Model: ${model})`);

    const requestBody: OpenAIRequest = {
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: maxTokens,
    };

    const response = await requestUrl({
      url: endpoint,
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const data = response.json;
    return data.choices?.[0]?.message?.content || '';
  }

  private parseResponse(responseText: string): DecompositionResult {
    try {
      // Clean up markdown code blocks if present
      const cleanText = responseText.replace(/```json\n?|\n?```/g, '').trim();

      // Attempt to find JSON object
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法从响应中解析 JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.cards || !Array.isArray(parsed.cards)) {
          console.warn('Parsed JSON missing cards array, attempting to fix or default', parsed);
          return {
              cards: [],
              summary: '解析警告: 返回格式不符合预期',
              estimatedCount: 0
          };
      }

      const validTags: CardTag[] = ['认知观念', '方法工具', '行动指南', '资源列表', '案例实战'];
      const validatedCards: AtomicCard[] = parsed.cards.map((card: any) => {
          let tags = Array.isArray(card.tags) ? card.tags : [];
          // Filter to only include valid tags
          tags = tags.filter((t: string) => validTags.includes(t as CardTag));
          // Default if empty
          if (tags.length === 0) {
              tags = ['认知观念'];
          }
          return {
              ...card,
              tags: tags as CardTag[]
          };
      });

      return {
        cards: validatedCards,
        summary: `成功拆解为 ${validatedCards.length} 张卡片`,
        estimatedCount: validatedCards.length,
      };
    } catch (error) {
      console.error('解析响应失败:', error, '\nRaw Response:', responseText);
      return {
        cards: [],
        summary: '解析失败: ' + (error instanceof Error ? error.message : String(error)),
        estimatedCount: 0,
      };
    }
  }
}
