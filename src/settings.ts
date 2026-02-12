import { App, PluginSettingTab, Setting } from 'obsidian';
import AtomicNotesPlugin from './main';

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
  }
}
