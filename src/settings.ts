import { App, PluginSettingTab, Setting, Modal, Notice } from 'obsidian';
import AtomicNotesPlugin from './main';
import { LLMService } from './services/llm-service';

export class AtomicNotesSettingTab extends PluginSettingTab {
  plugin: AtomicNotesPlugin;

  constructor(app: App, plugin: AtomicNotesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // 标题
    containerEl.createEl('h2', { text: 'Atomic Notes 设置' });

    // API Provider 选择
    new Setting(containerEl)
      .setName('LLM Provider')
      .setDesc('选择 AI 服务提供商')
      .addDropdown(dropdown => dropdown
        .addOption('claude', 'Anthropic Claude')
        .addOption('openai', 'OpenAI GPT')
        .addOption('ollama', 'Ollama (本地)')
        .setValue(this.plugin.settings.provider)
        .onChange(async (value: 'claude' | 'openai' | 'ollama') => {
          this.plugin.settings.provider = value;
          await this.plugin.saveSettings();
          this.display(); // 重新渲染以显示/隐藏 Ollama 配置
        })
      );

    // API Key（仅非 Ollama 需要）
    if (this.plugin.settings.provider !== 'ollama') {
      new Setting(containerEl)
        .setName('API Key')
        .setDesc('输入你的 API Key（本地加密存储）')
        .addText(text => text
          .setPlaceholder('sk-...')
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          })
        );

      // 提示文字
      const helpEl = containerEl.createEl('p', {
        text: '如何获取 API Key？',
        cls: 'setting-item-description'
      });

      if (this.plugin.settings.provider === 'claude') {
        containerEl.createEl('a', {
          text: '→ Anthropic Console',
          href: 'https://console.anthropic.com/'
        });
      } else if (this.plugin.settings.provider === 'openai') {
        containerEl.createEl('a', {
          text: '→ OpenAI Platform',
          href: 'https://platform.openai.com/api-keys'
        });
      }
    }

    // Ollama 配置（仅当选择 Ollama 时显示）
    if (this.plugin.settings.provider === 'ollama') {
      containerEl.createEl('h3', { text: 'Ollama 配置' });

      new Setting(containerEl)
        .setName('Base URL')
        .setDesc('Ollama 服务地址（默认: http://127.0.0.1:11434）')
        .addText(text => text
          .setPlaceholder('http://127.0.0.1:11434')
          .setValue(this.plugin.settings.ollamaBaseUrl)
          .onChange(async (value) => {
            this.plugin.settings.ollamaBaseUrl = value;
            await this.plugin.saveSettings();
          })
        );

      new Setting(containerEl)
        .setName('模型名称')
        .setDesc('Ollama 模型名称（如: qwen2.5:32b, llama3.1:8b）')
        .addText(text => text
          .setPlaceholder('qwen2.5:32b')
          .setValue(this.plugin.settings.ollamaModel)
          .onChange(async (value) => {
            this.plugin.settings.ollamaModel = value;
            await this.plugin.saveSettings();
          })
        );

      new Setting(containerEl)
        .setName('API Key (可选)')
        .setDesc('如果你的 Ollama 服务需要 API Key，在这里填写')
        .addText(text => text
          .setPlaceholder('sk-...')
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          })
        );

      containerEl.createEl('p', {
        text: '💡 确保 Ollama 服务正在运行，并且已下载所需模型',
        cls: 'setting-item-description'
      });
    }

    containerEl.createEl('h3', { text: '拆解设置' });

    // 拆解粒度
    new Setting(containerEl)
      .setName('拆解粒度')
      .setDesc('控制生成卡片的数量和详细程度')
      .addDropdown(dropdown => dropdown
        .addOption('fine', '精细（更多小卡片）')
        .addOption('medium', '中等（推荐）')
        .addOption('coarse', '粗略（较少大卡片）')
        .setValue(this.plugin.settings.granularity)
        .onChange(async (value: 'fine' | 'medium' | 'coarse') => {
          this.plugin.settings.granularity = value;
          await this.plugin.saveSettings();
        })
      );

    // 默认保存位置
    new Setting(containerEl)
      .setName('默认保存文件夹')
      .setDesc('留空则保存在原笔记同级目录')
      .addText(text => text
        .setPlaceholder('例如: Cards/')
        .setValue(this.plugin.settings.defaultFolder)
        .onChange(async (value) => {
          this.plugin.settings.defaultFolder = value;
          await this.plugin.saveSettings();
        })
      );

    // 保留原笔记
    new Setting(containerEl)
      .setName('保留原笔记')
      .setDesc('拆解后是否保留原始笔记文件')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.keepOriginalNote)
        .onChange(async (value) => {
          this.plugin.settings.keepOriginalNote = value;
          await this.plugin.saveSettings();
        })
      );

    // 添加横幅
    new Setting(containerEl)
      .setName('添加横幅')
      .setDesc('在原笔记底部添加拆解信息横幅（仅当保留原笔记时生效）')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.addBanner)
        .onChange(async (value) => {
          this.plugin.settings.addBanner = value;
          await this.plugin.saveSettings();
        })
      );

    // 高级设置
    containerEl.createEl('h3', { text: '高级设置' });

    // 提示词自定义开关
    new Setting(containerEl)
      .setName('使用自定义提示词')
      .setDesc('启用后可以自定义 LLM 拆解提示词')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.useCustomPrompt)
        .onChange(async (value) => {
          this.plugin.settings.useCustomPrompt = value;
          await this.plugin.saveSettings();
          this.display(); // 重新渲染以显示/隐藏文本框
        })
      );

    // 仅当启用自定义提示词时显示编辑区域
    if (this.plugin.settings.useCustomPrompt) {
      // 提示词注意事项
      const noticeEl = containerEl.createDiv('setting-item-description');
      noticeEl.style.marginBottom = '10px';
      noticeEl.innerHTML = `
        <strong>📝 提示词注意事项：</strong>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>使用 <code>{noteContent}</code> 占位符表示笔记内容</li>
          <li>使用 <code>{granularity}</code> 占位符表示拆解粒度</li>
          <li>必须要求 LLM 输出 JSON 格式</li>
          <li>JSON 结构必须包含 cards 数组</li>
          <li>每个卡片必须包含：title, description, tags, content, explanation, relations, position</li>
          <li>relations 必须是包含 logic 和 concept 的对象数组</li>
        </ul>
      `;

      // 自定义提示词文本框
      new Setting(containerEl)
        .setName('自定义提示词')
        .setDesc('留空则使用默认提示词')
        .addTextArea(text => {
          text
            .setPlaceholder('在此输入自定义提示词...')
            .setValue(this.plugin.settings.customPrompt)
            .onChange(async (value) => {
              this.plugin.settings.customPrompt = value;
              await this.plugin.saveSettings();
            });

          // 设置文本框样式
          text.inputEl.rows = 15;
          text.inputEl.style.width = '100%';
          text.inputEl.style.fontFamily = 'monospace';
          text.inputEl.style.fontSize = '12px';
        });

      // 操作按钮区域
      const buttonContainer = containerEl.createDiv();
      buttonContainer.style.display = 'flex';
      buttonContainer.style.gap = '10px';
      buttonContainer.style.marginTop = '10px';

      // 重置为默认提示词按钮
      const resetButton = buttonContainer.createEl('button', {
        text: '📋 重置为默认提示词',
        cls: 'mod-cta'
      });
      resetButton.onclick = async () => {
        this.plugin.settings.customPrompt = LLMService.getDefaultPromptTemplate();
        await this.plugin.saveSettings();
        this.display(); // 重新渲染
        new Notice('已重置为默认提示词');
      };

      // 查看默认提示词按钮
      const viewDefaultButton = buttonContainer.createEl('button', {
        text: '👁️ 查看默认提示词'
      });
      viewDefaultButton.onclick = () => {
        const modal = new Modal(this.app);
        modal.titleEl.setText('默认提示词');
        modal.contentEl.createEl('pre', {
          text: LLMService.getDefaultPromptTemplate(),
          cls: 'language-text'
        }).style.cssText = 'background: var(--background-secondary); padding: 15px; border-radius: 5px; max-height: 400px; overflow-y: auto; font-size: 12px;';
        modal.open();
      };
    }
  }
}
