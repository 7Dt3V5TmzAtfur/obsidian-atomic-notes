import { App, PluginSettingTab, Setting, Modal, Notice } from 'obsidian';
import AtomicNotesPlugin from './main';
import { PromptTemplate } from './types';
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

    containerEl.createEl('h2', { text: 'Atomic Notes 设置' });

    // =========================================================================
    // 1. API Configuration
    // =========================================================================
    const apiSection = containerEl.createEl('details', { attr: { open: true } });
    apiSection.createEl('summary', { text: '▼ API Configuration' }).style.fontWeight = 'bold';
    apiSection.style.marginBottom = '20px';
    const apiContent = apiSection.createDiv();
    apiContent.style.paddingLeft = '10px';
    apiContent.style.borderLeft = '2px solid var(--background-modifier-border)';

    new Setting(apiContent)
      .setName('LLM Provider')
      .setDesc('选择 AI 服务提供商')
      .addDropdown(dropdown => dropdown
        .addOption('claude', 'Anthropic Claude')
        .addOption('openai', 'OpenAI GPT')
        .addOption('ollama', 'Ollama (Local)')
        .addOption('custom', 'Custom (OpenAI Compatible)')
        .setValue(this.plugin.settings.provider)
        .onChange(async (value: 'claude' | 'openai' | 'ollama' | 'custom') => {
          this.plugin.settings.provider = value;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    const provider = this.plugin.settings.provider;
    const isLocalOrCustom = provider === 'ollama' || provider === 'custom';

    new Setting(apiContent)
      .setName('API Key')
      .setDesc(isLocalOrCustom ? '本地/自建服务如不需要验证可留空' : '请输入 API Key')
      .addText(text => text
        .setPlaceholder('sk-...')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
        })
      );

    if (provider === 'openai') {
      new Setting(apiContent)
        .setName('OpenAI Model')
        .addDropdown(dropdown => dropdown
          .addOption('gpt-4o', 'GPT-4o')
          .addOption('gpt-4-turbo', 'GPT-4 Turbo')
          .addOption('gpt-3.5-turbo', 'GPT-3.5 Turbo')
          .setValue(this.plugin.settings.openaiModel || 'gpt-4o')
          .onChange(async (value) => {
            this.plugin.settings.openaiModel = value;
            await this.plugin.saveSettings();
          })
        );
    }

    if (isLocalOrCustom) {
      new Setting(apiContent)
        .setName('Base URL')
        .setDesc(provider === 'ollama'
            ? 'Ollama 地址 (默认: http://127.0.0.1:11434)'
            : 'API 地址 (例如: https://api.moonshot.cn/v1)'
        )
        .addText(text => text
          .setPlaceholder(provider === 'ollama' ? 'http://127.0.0.1:11434' : 'https://api.example.com/v1')
          .setValue(this.plugin.settings.ollamaBaseUrl)
          .onChange(async (value) => {
            this.plugin.settings.ollamaBaseUrl = value;
            await this.plugin.saveSettings();
          })
        );

      new Setting(apiContent)
        .setName('Model Name')
        .setDesc('模型名称 (例如: qwen2.5:32b, deepseek-chat)')
        .addText(text => text
          .setPlaceholder('qwen2.5:32b')
          .setValue(this.plugin.settings.ollamaModel)
          .onChange(async (value) => {
            this.plugin.settings.ollamaModel = value;
            await this.plugin.saveSettings();
          })
        );
    }

    new Setting(apiContent)
        .setName('Test Connection')
        .setDesc('测试当前 LLM 连接配置')
        .addButton(btn => btn
            .setButtonText('Verify')
            .onClick(async () => {
                const notice = new Notice('Testing connection...', 5000);
                try {
                    const llm = new LLMService(this.plugin.settings);
                    const success = await llm.testConnection();
                    if (success) {
                        new Notice('✅ Connection successful!');
                    } else {
                        new Notice('❌ Connection failed. Check console for details.');
                    }
                } catch (e) {
                    new Notice('❌ Error: ' + e.message);
                }
            })
        );


    // =========================================================================
    // 2. Decomposition Settings
    // =========================================================================
    const decompSection = containerEl.createEl('details', { attr: { open: true } });
    decompSection.createEl('summary', { text: '▼ Decomposition Settings' }).style.fontWeight = 'bold';
    decompSection.style.marginBottom = '20px';
    const decompContent = decompSection.createDiv();
    decompContent.style.paddingLeft = '10px';
    decompContent.style.borderLeft = '2px solid var(--background-modifier-border)';

    new Setting(decompContent)
      .setName('拆解粒度 (Granularity)')
      .setDesc('控制生成卡片的详细程度')
      .addDropdown(dropdown => dropdown
        .addOption('fine', '精细 (50-150字/卡片)')
        .addOption('medium', '中等 (150-300字/卡片) [推荐]')
        .addOption('coarse', '粗略 (300-500字/卡片)')
        .setValue(this.plugin.settings.granularity)
        .onChange(async (value: any) => {
          this.plugin.settings.granularity = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(decompContent)
      .setName('卡片存放位置')
      .setDesc('留空则在原笔记同级创建 {笔记名}-atomic/ 文件夹')
      .addText(text => text
        .setPlaceholder('Cards/')
        .setValue(this.plugin.settings.defaultFolder)
        .onChange(async (value) => {
          this.plugin.settings.defaultFolder = value;
          await this.plugin.saveSettings();
        })
      );

    decompContent.createDiv({ text: '自动添加标签', cls: 'setting-item-heading' }).style.marginBottom = '10px';

    new Setting(decompContent)
      .setName('继承原笔记标签')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.inheritTags)
        .onChange(async (value) => {
          this.plugin.settings.inheritTags = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(decompContent)
      .setName('添加 #atomic-card 标签')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.addAtomicTag)
        .onChange(async (value) => {
          this.plugin.settings.addAtomicTag = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(decompContent)
        .setName('自定义标签')
        .setDesc('额外添加的标签 (逗号分隔)')
        .addText(text => text
            .setPlaceholder('inbox, review')
            .setValue(this.plugin.settings.customTags)
            .onChange(async (value) => {
                this.plugin.settings.customTags = value;
                await this.plugin.saveSettings();
            })
        );


    // =========================================================================
    // 3. Original Note Handling
    // =========================================================================
    const originalSection = containerEl.createEl('details', { attr: { open: true } });
    originalSection.createEl('summary', { text: '▼ Original Note Handling' }).style.fontWeight = 'bold';
    originalSection.style.marginBottom = '20px';
    const originalContent = originalSection.createDiv();
    originalContent.style.paddingLeft = '10px';
    originalContent.style.borderLeft = '2px solid var(--background-modifier-border)';

    new Setting(originalContent)
      .setName('保留并添加拆解横幅')
      .setDesc('在原笔记顶部添加指向新卡片的链接横幅')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.addBanner)
        .onChange(async (value) => {
          this.plugin.settings.addBanner = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(originalContent)
      .setName('归档原笔记')
      .setDesc('拆解后将原笔记移动到归档文件夹')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.archiveOriginal)
        .onChange(async (value) => {
            this.plugin.settings.archiveOriginal = value;
            await this.plugin.saveSettings();
            this.display(); // refresh to show/hide folder input
        })
      );

    if (this.plugin.settings.archiveOriginal) {
        new Setting(originalContent)
            .setName('归档文件夹')
            .addText(text => text
                .setPlaceholder('Archive/')
                .setValue(this.plugin.settings.archiveFolder)
                .onChange(async (value) => {
                    this.plugin.settings.archiveFolder = value;
                    await this.plugin.saveSettings();
                })
            );
    }

    new Setting(originalContent)
      .setName('添加 #已拆解 标签')
      .setDesc('标记原笔记为已处理')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.addDecomposedTag)
        .onChange(async (value) => {
          this.plugin.settings.addDecomposedTag = value;
          await this.plugin.saveSettings();
        })
      );


    // =========================================================================
    // 4. Advanced Options
    // =========================================================================
    const advancedSection = containerEl.createEl('details');
    advancedSection.createEl('summary', { text: '▼ Advanced Options' }).style.fontWeight = 'bold';
    advancedSection.style.marginBottom = '20px';
    const advancedContent = advancedSection.createDiv();
    advancedContent.style.paddingLeft = '10px';
    advancedContent.style.borderLeft = '2px solid var(--background-modifier-border)';

    new Setting(advancedContent)
      .setName('最小笔记长度')
      .setDesc('字数少于此长度时不建议拆解')
      .addText(text => text
        .setValue(String(this.plugin.settings.minNoteLength))
        .onChange(async (value) => {
          const num = parseInt(value);
          if (!isNaN(num)) {
            this.plugin.settings.minNoteLength = num;
            await this.plugin.saveSettings();
          }
        })
      );

    new Setting(advancedContent)
      .setName('保留撤销历史时长 (天)')
      .setDesc('超过此时长的操作记录将被清理')
      .addText(text => text
        .setValue(String(this.plugin.settings.undoHistoryDays))
        .onChange(async (value) => {
          const num = parseInt(value);
          if (!isNaN(num)) {
            this.plugin.settings.undoHistoryDays = num;
            await this.plugin.saveSettings();
          }
        })
      );

    new Setting(advancedContent)
      .setName('Smart Tags (Context Awareness)')
      .setDesc('将 Vault 中常用的标签发送给 AI，以提高标签一致性')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.smartTags)
        .onChange(async (value) => {
          this.plugin.settings.smartTags = value;
          await this.plugin.saveSettings();
        })
      );


    // =========================================================================
    // 5. Template Management (Existing)
    // =========================================================================
    containerEl.createEl('h3', { text: 'Prompt 模板管理' });

    // Active Template Selector
    new Setting(containerEl)
      .setName('当前使用的模板')
      .setDesc('选择拆解笔记时使用的 Prompt 模板')
      .addDropdown(dropdown => {
        this.plugin.settings.templates.forEach(t => {
          dropdown.addOption(t.id, t.name);
        });
        dropdown.setValue(this.plugin.settings.activeTemplateId);
        dropdown.onChange(async (value) => {
          this.plugin.settings.activeTemplateId = value;
          await this.plugin.saveSettings();
        });
      });

    // Template List Management
    const templatesContainer = containerEl.createDiv('templates-container');
    templatesContainer.style.marginTop = '10px';

    this.plugin.settings.templates.forEach((template, index) => {
      const details = templatesContainer.createEl('details');
      details.style.marginBottom = '10px';
      details.style.border = '1px solid var(--background-modifier-border)';
      details.style.borderRadius = '5px';
      details.style.padding = '5px';

      const summary = details.createEl('summary');
      summary.style.cursor = 'pointer';
      summary.style.fontWeight = 'bold';
      summary.style.padding = '5px';
      summary.setText(`${template.name} ${template.id === this.plugin.settings.activeTemplateId ? '(当前)' : ''}`);

      const content = details.createDiv();
      content.style.padding = '10px';

      // Template Name
      new Setting(content)
        .setName('模板名称')
        .addText(text => text
          .setValue(template.name)
          .onChange(async (value) => {
            template.name = value;
            summary.setText(`${value} ${template.id === this.plugin.settings.activeTemplateId ? '(当前)' : ''}`);
            await this.plugin.saveSettings();
          })
        );

      // System Prompt
      new Setting(content)
        .setName('System Prompt')
        .setDesc('系统预设角色')
        .addTextArea(text => {
            text.setValue(template.systemPrompt);
            text.inputEl.rows = 2;
            text.inputEl.style.width = '100%';
            text.onChange(async (value) => {
                template.systemPrompt = value;
                await this.plugin.saveSettings();
            });
        });

      // User Prompt
      const userPromptSetting = new Setting(content)
        .setName('User Prompt')
        .setDesc('支持变量: {{content}}, {{title}}')
        .addTextArea(text => {
            text.setValue(template.userPrompt);
            text.inputEl.rows = 8;
            text.inputEl.style.width = '100%';
            text.inputEl.style.fontFamily = 'monospace';
            text.onChange(async (value) => {
                template.userPrompt = value;
                await this.plugin.saveSettings();
            });
        });
      // Force prompt setting to be block
      userPromptSetting.settingEl.style.display = 'block';
      userPromptSetting.infoEl.style.marginBottom = '5px';

      // Actions
      const actionsDiv = content.createDiv();
      actionsDiv.style.display = 'flex';
      actionsDiv.style.gap = '10px';
      actionsDiv.style.marginTop = '10px';
      actionsDiv.style.justifyContent = 'flex-end';

      // Export Button
      const exportBtn = actionsDiv.createEl('button', { text: '分享/导出' });
      exportBtn.onclick = async () => {
          const json = JSON.stringify(template, null, 2);
          await navigator.clipboard.writeText(json);
          new Notice('已复制到剪贴板，快去分享给朋友吧！');
      };

      if (!template.isDefault) {
          const deleteBtn = actionsDiv.createEl('button', { text: '删除模板' });
          deleteBtn.style.backgroundColor = 'var(--background-modifier-error)';
          deleteBtn.style.color = 'var(--text-on-accent)';
          deleteBtn.onclick = async () => {
              if (confirm(`确定要删除模板 "${template.name}" 吗?`)) {
                  this.plugin.settings.templates = this.plugin.settings.templates.filter(t => t.id !== template.id);
                  if (this.plugin.settings.activeTemplateId === template.id) {
                      this.plugin.settings.activeTemplateId = this.plugin.settings.templates[0].id;
                  }
                  await this.plugin.saveSettings();
                  this.display();
              }
          };
      }
    });

    // Add New Template Button & Import
    const addBtnContainer = containerEl.createDiv();
    addBtnContainer.style.marginTop = '20px';
    addBtnContainer.style.textAlign = 'center';
    addBtnContainer.style.display = 'flex';
    addBtnContainer.style.justifyContent = 'center';
    addBtnContainer.style.gap = '10px';

    const addBtn = addBtnContainer.createEl('button', { text: '+ 新增模板' });
    addBtn.addClass('mod-cta');
    addBtn.onclick = async () => {
        const newTemplate: PromptTemplate = {
            id: Date.now().toString(),
            name: '新模板',
            systemPrompt: '',
            userPrompt: '{{content}}\n\n请输出 JSON...',
            isDefault: false
        };
        this.plugin.settings.templates.push(newTemplate);
        await this.plugin.saveSettings();
        this.display();
    };

    const importBtn = addBtnContainer.createEl('button', { text: '导入模板' });
    importBtn.onclick = async () => {
        const json = window.prompt('请粘贴模板 JSON:');
        if (json) {
            try {
                const parsed = JSON.parse(json);
                if (parsed.name && parsed.userPrompt) {
                    parsed.id = Date.now().toString(); // Reset ID to avoid conflicts
                    parsed.isDefault = false;
                    this.plugin.settings.templates.push(parsed);
                    await this.plugin.saveSettings();
                    this.display();
                    new Notice('模板导入成功！');
                } else {
                    new Notice('导入失败：缺少 name 或 userPrompt 字段');
                }
            } catch (e) {
                new Notice('导入失败：JSON 格式无效');
            }
        }
    };
  }
}
