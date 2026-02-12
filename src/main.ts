import { Plugin, TFile, Notice } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS, AtomicCard } from './types';
import { AtomicNotesSettingTab } from './settings';
import { LLMService } from './services/llm-service';
import { LinkResolver } from './services/link-resolver';
import { ProgressModal } from './ui/progress-modal';
import { PreviewModal } from './ui/preview-modal';

export default class AtomicNotesPlugin extends Plugin {
  settings: PluginSettings;
  llmService: LLMService;
  linkResolver: LinkResolver;

  async onload() {
    console.log('Loading Atomic Notes plugin');

    // 1. 加载设置
    await this.loadSettings();

    // 2. 初始化服务
    this.llmService = new LLMService(this.settings);
    this.linkResolver = new LinkResolver(this.app.vault);

    // 3. 添加设置页面
    this.addSettingTab(new AtomicNotesSettingTab(this.app, this));

    // 4. 注册命令
    this.addCommand({
      id: 'decompose-note',
      name: '拆解当前笔记为原子卡片',
      callback: () => this.decomposeCurrentNote(),
    });

    // 5. 添加右键菜单
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile && file.extension === 'md') {
          menu.addItem((item) => {
            item
              .setTitle('🧩 拆解为原子卡片')
              .setIcon('split')
              .onClick(() => this.decomposeNote(file));
          });
        }
      })
    );

    // 6. 监听 Vault 变化，重建索引
    this.registerEvent(
      this.app.vault.on('create', () => this.linkResolver.rebuildIndex())
    );
    this.registerEvent(
      this.app.vault.on('delete', () => this.linkResolver.rebuildIndex())
    );
    this.registerEvent(
      this.app.vault.on('rename', () => this.linkResolver.rebuildIndex())
    );
  }

  async decomposeCurrentNote() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('请先打开一个笔记');
      return;
    }
    await this.decomposeNote(activeFile);
  }

  async decomposeNote(file: TFile) {
    // 检查 API Key
    if (!this.settings.apiKey) {
      new Notice('请先在设置中配置 API Key');
      return;
    }

    // 读取笔记内容
    const content = await this.app.vault.read(file);
    if (!content.trim()) {
      new Notice('笔记内容为空');
      return;
    }

    // 显示进度窗口
    const progressModal = new ProgressModal(this.app);
    progressModal.open();

    try {
      // 调用 LLM 拆解
      progressModal.updateProgress('正在分析笔记结构...', 30);
      const response = await this.llmService.decompose(content);

      if (!response.success || !response.data) {
        throw new Error(response.error || '拆解失败');
      }

      progressModal.updateProgress('正在识别关联概念...', 60);
      const cards = response.data.cards;

      // 验证关联概念
      for (const card of cards) {
        card.relations = this.linkResolver.validateConcepts(card.relations);
      }

      progressModal.updateProgress('完成！', 100);
      progressModal.close();

      // 显示预览窗口
      const previewModal = new PreviewModal(
        this.app,
        cards,
        (acceptedCards) => this.createCards(file, acceptedCards)
      );
      previewModal.open();

    } catch (error) {
      progressModal.close();
      console.error('拆解失败:', error);
      new Notice(`拆解失败: ${error.message}`);
    }
  }

  async createCards(sourceFile: TFile, cards: AtomicCard[]) {
    try {
      // 确定保存位置
      const folder = this.settings.defaultFolder ||
        sourceFile.parent?.path || '';

      const cardFolder = folder
        ? `${folder}/${sourceFile.basename}-atomic`
        : `${sourceFile.basename}-atomic`;

      // 创建文件夹
      if (!await this.app.vault.adapter.exists(cardFolder)) {
        await this.app.vault.createFolder(cardFolder);
      }

      // 生成每张卡片
      for (const card of cards) {
        const fileName = `${cardFolder}/${card.title}.md`;
        const fileContent = this.generateCardMarkdown(card);

        await this.app.vault.create(fileName, fileContent);
      }

      // 在原笔记添加横幅
      if (this.settings.keepOriginalNote) {
        const banner = `\n\n---\n## 📦 已拆解为原子卡片\n\n${cards.map(c => `- [[${c.title}]]`).join('\n')}\n`;
        const originalContent = await this.app.vault.read(sourceFile);
        await this.app.vault.modify(sourceFile, originalContent + banner);
      }

      new Notice(`✅ 成功创建 ${cards.length} 张卡片到 ${cardFolder}`);

    } catch (error) {
      console.error('创建卡片失败:', error);
      new Notice(`创建卡片失败: ${error.message}`);
    }
  }

  private generateCardMarkdown(card: AtomicCard): string {
    const frontmatter = `---
description: ${card.description}
tags: ${card.tags.join(', ')}
---

`;

    const content = `- **内容**：${card.content}
- **说明**：${card.explanation}`;

    const relations = card.relations.length > 0
      ? `\n- **关联**：${card.relations.map(r => `[[${r}]]`).join(' | ')}`
      : '';

    const position = [];
    if (card.position.parent) {
      position.push(`[向上追溯] [[${card.position.parent}]]`);
    }
    if (card.position.children && card.position.children.length > 0) {
      position.push(`[向下拆解] ${card.position.children.map(c => `[[${c}]]`).join(', ')}`);
    }
    const positionStr = position.length > 0
      ? `\n- **位置**：${position.join('；')}`
      : '';

    return frontmatter + content + relations + positionStr;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // 重新初始化 LLM Service
    this.llmService = new LLMService(this.settings);
  }

  onunload() {
    console.log('Unloading Atomic Notes plugin');
  }
}
