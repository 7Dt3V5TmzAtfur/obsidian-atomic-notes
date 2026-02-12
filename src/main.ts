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
    // 检查 API Key（Ollama 可能不需要）
    if (this.settings.provider !== 'ollama' && !this.settings.apiKey) {
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
      // 步骤1: 分析笔记结构 (0-30%)
      progressModal.updateProgress(10);

      const response = await this.llmService.decompose(content);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'LLM 拆解失败');
      }

      const cards = response.data.cards;

      if (!cards || cards.length === 0) {
        throw new Error('未能识别到任何原子概念，请检查笔记内容');
      }

      // 步骤2: 识别核心概念 (30-60%)
      progressModal.updateProgress(45);

      // 优化关联概念：尝试匹配现有笔记，但保留无法匹配的概念
      for (const card of cards) {
        if (card.relations && card.relations.length > 0) {
          // 提取概念名称进行验证
          const concepts = card.relations.map(r => r.concept);
          const validated = this.linkResolver.validateConcepts(concepts);

          // 如果找到了匹配的笔记，更新概念名称；否则保留原始概念
          if (validated.length > 0) {
            // 更新每个关联的 concept 为匹配到的笔记名
            card.relations = card.relations.map((r, index) => ({
              logic: r.logic,
              concept: validated[index] || r.concept  // 使用验证结果或保留原值
            }));
          }
          // 如果一个都没匹配到，保留 LLM 原始的概念名称
        }
      }

      // 步骤3: 建立关联 (60-90%)
      progressModal.updateProgress(75);

      // 短暂延迟，让用户看到进度
      await new Promise(resolve => setTimeout(resolve, 300));

      // 步骤4: 生成卡片 (90-100%)
      progressModal.updateProgress(95);

      // 短暂延迟
      await new Promise(resolve => setTimeout(resolve, 200));

      progressModal.updateProgress(100);

      // 短暂延迟后关闭进度窗口
      await new Promise(resolve => setTimeout(resolve, 200));
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

      // 友好的错误提示
      let errorMessage = '拆解失败';
      let canRetry = false;

      if (error instanceof Error) {
        if (error.message.includes('API') || error.message.includes('网络') || error.message.includes('fetch')) {
          errorMessage = '网络连接失败，请检查网络或 API Key 配置';
          canRetry = true;
        } else if (error.message.includes('解析') || error.message.includes('JSON')) {
          errorMessage = 'AI 响应格式错误，建议重试';
          canRetry = true;
        } else if (error.message.includes('API Key') || error.message.includes('apiKey')) {
          errorMessage = '请先在设置中配置有效的 API Key';
          canRetry = false;
        } else if (error.message.includes('未能识别')) {
          errorMessage = '笔记内容无法拆解，请确保笔记包含足够的知识内容';
          canRetry = false;
        } else {
          errorMessage = `拆解失败: ${error.message}`;
          canRetry = true;
        }
      }

      // 显示错误通知
      new Notice(`❌ ${errorMessage}${canRetry ? '\n\n💡 提示：可以再次尝试' : ''}`, 6000);
    }
  }

  async createCards(sourceFile: TFile, cards: AtomicCard[]) {
    try {
      // 检查是否有卡片要创建
      if (!cards || cards.length === 0) {
        new Notice('没有卡片需要创建');
        return;
      }

      // 确定保存位置
      const parentPath = sourceFile.parent?.path || '';
      const cardFolder = this.settings.defaultFolder
        ? `${this.settings.defaultFolder}/${sourceFile.basename}-atomic`
        : (parentPath ? `${parentPath}/${sourceFile.basename}-atomic` : `${sourceFile.basename}-atomic`);

      // 创建文件夹（如果不存在）
      if (!await this.app.vault.adapter.exists(cardFolder)) {
        await this.app.vault.createFolder(cardFolder);
      }

      // 生成每张卡片
      let successCount = 0;
      let skipCount = 0;

      for (const card of cards) {
        // 清理标题中的非法字符
        const safeTitle = this.sanitizeFileName(card.title);
        const fileName = `${cardFolder}/${safeTitle}.md`;

        // 检查文件是否已存在
        if (await this.app.vault.adapter.exists(fileName)) {
          console.warn(`文件已存在，跳过: ${fileName}`);
          skipCount++;
          continue;
        }

        const fileContent = this.generateCardMarkdown(card);

        try {
          await this.app.vault.create(fileName, fileContent);
          successCount++;
        } catch (err) {
          console.error(`创建文件失败: ${fileName}`, err);
          skipCount++;
        }
      }

      // 在原笔记添加横幅（仅当保留原笔记且启用横幅时）
      if (this.settings.keepOriginalNote && this.settings.addBanner && successCount > 0) {
        const timestamp = new Date().toISOString().split('T')[0];
        const banner = `\n\n---\n## 📦 已拆解为原子卡片\n\n**拆解时间**: ${timestamp}\n**卡片数量**: ${successCount}\n**保存位置**: \`${cardFolder}\`\n\n${cards.slice(0, successCount).map(c => `- [[${this.sanitizeFileName(c.title)}]]`).join('\n')}\n`;

        const originalContent = await this.app.vault.read(sourceFile);
        await this.app.vault.modify(sourceFile, originalContent + banner);
      }

      // 显示结果通知（Toast 通知）
      if (successCount > 0) {
        new Notice(`✅ 已生成 ${successCount} 张原子卡片${skipCount > 0 ? `（跳过 ${skipCount} 个已存在）` : ''}`, 5000);
      } else {
        new Notice('⚠️ 没有创建任何卡片', 4000);
      }

    } catch (error) {
      console.error('创建卡片失败:', error);

      let errorMessage = '创建卡片失败';
      if (error instanceof Error) {
        if (error.message.includes('exist') || error.message.includes('EEXIST')) {
          errorMessage = '文件夹创建失败，请检查文件权限';
        } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
          errorMessage = '没有写入权限，请检查文件夹权限设置';
        } else if (error.message.includes('ENOSPC')) {
          errorMessage = '磁盘空间不足，请清理后重试';
        } else {
          errorMessage = `创建失败: ${error.message}`;
        }
      }

      new Notice(`❌ ${errorMessage}`, 5000);
    }
  }

  /**
   * 清理文件名中的非法字符
   */
  private sanitizeFileName(title: string): string {
    // 移除或替换非法字符: \ / : * ? " < > |
    return title
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200); // 限制文件名长度
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
      ? `\n- **关联**：${card.relations.map(r => `${r.logic} [[${r.concept}]]`).join('；')}`
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
