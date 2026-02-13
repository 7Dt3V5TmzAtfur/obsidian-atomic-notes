import { Plugin, TFile, Notice, TFolder, WorkspaceLeaf } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS, AtomicCard, DecompositionHistoryItem } from './types';
import { AtomicNotesSettingTab } from './settings';
import { LLMService } from './services/llm-service';
import { LinkResolver } from './services/link-resolver';
import { UndoService, FileOperation } from './services/undo-service';
import { CanvasService } from './services/canvas-service';
import { PreviewModal } from './ui/preview-modal';
import { StatusWidget } from './ui/status-widget';
import { AtomicHistoryView, VIEW_TYPE_ATOMIC_HISTORY } from './ui/history-view';

export default class AtomicNotesPlugin extends Plugin {
  settings: PluginSettings;
  llmService: LLMService;
  linkResolver: LinkResolver;
  undoService: UndoService;
  canvasService: CanvasService;
  statusWidget: StatusWidget;

  async onload() {
    // 1. 加载设置
    await this.loadSettings();

    // 2. 初始化服务
    this.llmService = new LLMService(this.settings);
    this.linkResolver = new LinkResolver(this.app.vault);
    this.undoService = new UndoService(this.app);
    this.canvasService = new CanvasService();
    this.statusWidget = new StatusWidget(this.app, this);

    // 3. 添加设置页面
    this.addSettingTab(new AtomicNotesSettingTab(this.app, this));

    // 注册视图
    this.registerView(
      VIEW_TYPE_ATOMIC_HISTORY,
      (leaf) => new AtomicHistoryView(leaf, this)
    );

    // 4. 注册命令
    this.addCommand({
      id: 'decompose-note',
      name: '拆解当前笔记为原子卡片',
      callback: () => this.decomposeCurrentNote(),
    });

    this.addCommand({
      id: 'open-history-view',
      name: 'Show Decomposition History',
      callback: () => this.activateHistoryView(),
    });

    this.addCommand({
      id: 'undo-generation',
      name: '撤销上一次拆解 (Undo)',
      callback: () => this.undoService.undo(),
    });

    this.addCommand({
      id: 'redo-generation',
      name: '重做上一次拆解 (Redo)',
      callback: () => this.undoService.redo(),
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
        } else if (file instanceof TFolder) {
          menu.addItem((item) => {
            item
              .setTitle('🧩 拆解文件夹内所有笔记')
              .setIcon('layers')
              .onClick(() => this.decomposeFolder(file));
          });
        }
      })
    );

    // Ribbon Icon for History
    this.addRibbonIcon('history', 'Atomic History', () => {
      this.activateHistoryView();
    });

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

  async activateHistoryView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_ATOMIC_HISTORY);

    if (leaves.length > 0) {
      // A leaf with our view already exists, use that
      leaf = leaves[0];
    } else {
      // Our view could not be found in the workspace, create a new leaf
      // in the right sidebar for it
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({ type: VIEW_TYPE_ATOMIC_HISTORY, active: true });
      }
    }

    // "Reveal" the leaf in case it is in a collapsed sidebar
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  async decomposeCurrentNote() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('请先打开一个笔记');
      return;
    }
    await this.decomposeNote(activeFile);
  }

  async decomposeFolder(folder: TFolder) {
    const files: TFile[] = [];
    // 递归获取所有 markdown 文件
    const collectFiles = (f: TFolder) => {
      for (const child of f.children) {
        if (child instanceof TFile && child.extension === 'md') {
          files.push(child);
        } else if (child instanceof TFolder) {
          collectFiles(child);
        }
      }
    };
    collectFiles(folder);

    if (files.length === 0) {
      new Notice('文件夹内没有 Markdown 笔记');
      return;
    }

    new Notice(`开始批量处理 ${files.length} 篇笔记...`);
    await this.batchDecompose(files);
  }

  async batchDecompose(files: TFile[]) {
    if (this.settings.provider !== 'ollama' && !this.settings.apiKey) {
      new Notice('请先在设置中配置 API Key');
      return;
    }

    // Use Status Widget for batch mode?
    // For now, keeping original ProgressModal logic for batch to avoid breaking it,
    // or we could refactor it to use status widget too.
    // The instructions focused on decomposeNote.
    // But let's use the new non-blocking widget for consistency if possible.
    // However, batch processing might need a different UI.
    // Let's stick to the request: "Refactor decomposeNote... Remove ProgressModal usage".
    // I will leave batchDecompose as is or minimally update if it breaks.
    // Actually, I removed ProgressModal import, so I MUST update batchDecompose.

    this.statusWidget.showFloatingWidget(`Batch Processing ${files.length} files`);

    const allOps: FileOperation[] = [];
    let successTotal = 0;
    let failTotal = 0;
    let processed = 0;

    try {
      for (const file of files) {
        processed++;
        const percent = Math.round((processed / files.length) * 100);
        this.statusWidget.updateProgress(percent, `Processing ${file.basename}...`);

        try {
          const content = await this.app.vault.read(file);
          if (!content.trim()) {
            continue;
          }

          const cards = await this.processNoteAI(content, (p, msg) => {
             // Internal progress for single file, maybe ignore or sub-update
          }, file.basename);

          // false = Do not commit transaction yet
          const ops = await this.createCards(file, cards, false);
          if (ops && ops.length > 0) {
            allOps.push(...ops);
            successTotal++;
          }
        } catch (err) {
          console.error(`处理文件失败 ${file.path}:`, err);
          failTotal++;
        }
      }
    } finally {
      this.statusWidget.hideFloatingWidget(2000);
      if (allOps.length > 0) {
        this.undoService.addTransaction(allOps);
        new Notice(`批量处理完成: 成功 ${successTotal}, 失败 ${failTotal}. 已记录 Undo。`, 5000);
      } else {
        new Notice(`批量处理结束，未生成任何卡片。`, 4000);
      }
    }
  }

  async processNoteAI(content: string, updateProgress: (percent: number, msg?: string) => void, title: string = ''): Promise<AtomicCard[]> {
      updateProgress(10, '正在分析笔记内容...');

      // 提取图片
      const images = await this.extractImages(content);
      if (images.length > 0) {
        updateProgress(15, `发现 ${images.length} 张图片，准备进行多模态分析...`);
      }

      const tags = this.getSmartTags();

      updateProgress(20, '正在调用 AI 进行拆解...');
      const response = await this.llmService.decompose(content, title, tags, images);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'LLM 拆解失败');
      }

      const cards = response.data.cards;
      if (!cards || cards.length === 0) {
        throw new Error('未能识别到任何原子概念');
      }

      updateProgress(45, '正在验证卡片关联...');
      for (const card of cards) {
        if (card.relations && card.relations.length > 0) {
          const concepts = card.relations.map(r => r.concept);
          const validated = this.linkResolver.validateConcepts(concepts);
          if (validated.length > 0) {
            card.relations = card.relations.map((r, index) => ({
              logic: r.logic,
              concept: validated[index] || r.concept
            }));
          }
        }
      }
      updateProgress(75, '准备生成卡片...');
      return cards;
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

    // 显示非阻塞状态组件
    this.statusWidget.showFloatingWidget(`Decomposing: ${file.basename}`);
    this.statusWidget.updateProgress(0, 'Starting...');

    try {
      // 复用 processNoteAI 逻辑
      const cards = await this.processNoteAI(content, (p, msg) => {
        this.statusWidget.updateProgress(p, msg);
      }, file.basename);

      // 步骤4: 生成卡片 (90-100%)
      this.statusWidget.updateProgress(95, 'Reviewing cards...');

      // 短暂延迟
      await new Promise(resolve => setTimeout(resolve, 500));

      // 完成状态，但在显示 PreviewModal 之前
      this.statusWidget.hideFloatingWidget();

      // 显示预览窗口 (Modals are blocking/interrupting by nature, but this is the decision point)
      const previewModal = new PreviewModal(
        this.app,
        cards,
        async (acceptedCards) => {
            const ops = await this.createCards(file, acceptedCards);

            // Record History
            this.recordHistory(file, acceptedCards.length, 'success');

            // Refresh View if open
            // this.activateHistoryView(); // Optional: auto open history
        }
      );
      previewModal.open();

    } catch (error) {
      this.statusWidget.updateProgress(100, 'Failed', 'error');
      console.error('拆解失败:', error);

      // Record History (Failed)
      this.recordHistory(file, 0, 'failed');

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

      new Notice(`❌ ${errorMessage}`, 6000);

      // Hide widget after delay
      setTimeout(() => {
        this.statusWidget.hideFloatingWidget();
      }, 3000);
    }
  }

  async recordHistory(file: TFile, count: number, status: 'success' | 'failed') {
      const historyItem: DecompositionHistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          originalNotePath: file.path,
          cardsGenerated: count,
          status: status
      };

      this.settings.history = this.settings.history || [];
      this.settings.history.unshift(historyItem);

      // Limit history size (e.g. 50 items)
      if (this.settings.history.length > 100) {
          this.settings.history = this.settings.history.slice(0, 100);
      }

      await this.saveSettings();
  }

  async createCards(sourceFile: TFile, cards: AtomicCard[], commitTransaction: boolean = true): Promise<FileOperation[]> {
    const currentOps: FileOperation[] = [];
    let successCount = 0;
    let skipCount = 0;

    try {
      // 检查是否有卡片要创建
      if (!cards || cards.length === 0) {
        if (commitTransaction) new Notice('没有卡片需要创建');
        return [];
      }

      // 确定保存位置
      let parentPath = sourceFile.parent?.path || '';
      parentPath = parentPath.replace(/^\/+|\/+$/g, '');

      const defaultFolder = this.settings.defaultFolder ? this.settings.defaultFolder.replace(/^\/+|\/+$/g, '') : '';

      const cardFolder = defaultFolder
        ? `${defaultFolder}/${sourceFile.basename}-atomic`
        : (parentPath ? `${parentPath}/${sourceFile.basename}-atomic` : `${sourceFile.basename}-atomic`);

      // 创建文件夹（如果不存在）
      if (!await this.app.vault.adapter.exists(cardFolder)) {
        await this.app.vault.createFolder(cardFolder);
      }

      // 生成每张卡片
      const createdCardPaths: string[] = [];

      for (const card of cards) {
        // 清理标题中的非法字符
        const safeTitle = this.sanitizeFileName(card.title);
        const fileName = `${cardFolder}/${safeTitle}.md`;

        // 检查文件是否已存在
        if (await this.app.vault.adapter.exists(fileName)) {
          console.warn(`文件已存在，跳过: ${fileName}`);
          skipCount++;
          // 如果文件已存在，是否包含在 canvas 中？
          // 通常来说应该包含，因为这是本次拆解的上下文。
          // 这里假设只要是相关的卡片都加入 Canvas
          createdCardPaths.push(fileName);
          continue;
        }

        const fileContent = this.generateCardMarkdown(card);

        try {
          await this.app.vault.create(fileName, fileContent);
          currentOps.push({ type: 'create', path: fileName });
          createdCardPaths.push(fileName);
          successCount++;
        } catch (err) {
          console.error(`创建文件失败: ${fileName}`, err);
          skipCount++;
        }
      }

      // 4. 生成 Canvas 文件 (New)
      if (createdCardPaths.length > 0) {
        try {
            const canvasData = this.canvasService.generateCanvas(sourceFile, createdCardPaths);
            const canvasFileName = `${sourceFile.basename}-atomic.canvas`;
            // Canvas 通常保存在卡片目录同级，或者是卡片目录内？
            // 需求：文件名 {originalNoteBaseName}-atomic.canvas
            // 放在原笔记同级比较合理，或者放在 defaultFolder

            // 沿用 cardFolder 的父目录逻辑
            const canvasPath = defaultFolder
                ? `${defaultFolder}/${canvasFileName}`
                : (parentPath ? `${parentPath}/${canvasFileName}` : canvasFileName);

            // 检查是否存在
            if (!await this.app.vault.adapter.exists(canvasPath)) {
                await this.app.vault.create(canvasPath, JSON.stringify(canvasData, null, 2));
                currentOps.push({ type: 'create', path: canvasPath });
            } else {
                new Notice(`Canvas 文件已存在: ${canvasFileName}`, 3000);
            }
        } catch (err) {
            console.error('生成 Canvas 失败:', err);
            new Notice('生成 Canvas 失败');
        }
      }

      // 在原笔记添加横幅（仅当保留原笔记且启用横幅时）
      if (this.settings.keepOriginalNote && this.settings.addBanner && successCount > 0) {
        const timestamp = new Date().toLocaleString();
        const cardLinks = cards.slice(0, successCount).map(c => `[[${this.sanitizeFileName(c.title)}]]`).join(' · ');

        const banner = `> [!info] 📋 本笔记已拆解为原子卡片
> **拆解时间**: ${timestamp}
> **生成卡片**: ${cardLinks}
>
> ---
>
`;

        const originalContent = await this.app.vault.read(sourceFile);

        // 记录修改前的状态
        currentOps.push({ type: 'modify', path: sourceFile.path, previousContent: originalContent });

        // Prepend banner to the top of the file
        await this.app.vault.modify(sourceFile, banner + originalContent);
      }

      // 显示结果通知（Toast 通知）
      if (commitTransaction) {
        if (successCount > 0) {
            new Notice(`✅ 已生成 ${successCount} 张原子卡片${skipCount > 0 ? `（跳过 ${skipCount} 个已存在）` : ''}`, 5000);
        } else {
            new Notice('⚠️ 没有创建任何卡片', 4000);
        }
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

      if (commitTransaction) {
        new Notice(`❌ ${errorMessage}`, 5000);
      }
    } finally {
      // 提交事务到 UndoService (保证原子性：无论成功或部分失败，都记录已执行的操作)
      if (commitTransaction && currentOps.length > 0) {
        this.undoService.addTransaction(currentOps);
      }
    }

    return currentOps;
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
      ? `\n- **关联**：${card.relations.map(r => `[${r.logic}] [[${r.concept}]]`).join('; ')}`
      : '';

    const position = [];
    if (card.position.parent) {
      position.push(`[向上追溯] [[${card.position.parent}]]`);
    }
    if (card.position.children && card.position.children.length > 0) {
      position.push(`[向下拆解] ${card.position.children.map(c => `[[${c}]]`).join(', ')}`);
    }
    const positionStr = position.length > 0
      ? `\n- **位置**：${position.join('; ')}`
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

  getSmartTags(): string[] {
    if (!this.settings.smartTags) return [];

    const tagCounts = (this.app.metadataCache as any).getTags() as Record<string, number>;
    // tagCounts is Record<string, number> where string is tag (e.g., "#tag") and number is count

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1]) // Sort by count desc
      .slice(0, 100) // Top 100
      .map(([tag]) => tag); // Extract tag name
  }

  /**
   * 从笔记内容中提取图片，并转换为 base64
   */
  async extractImages(content: string): Promise<string[]> {
    const images: string[] = [];
    const imageRegex = /!\[\[(.*?)\]\]|!\[.*?\]\((.*?)\)/g;
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
      const linkText = match[1] || match[2];
      if (!linkText) continue;

      // Clean up link text (remove size info like |100)
      const cleanLink = linkText.split('|')[0];

      const file = this.app.metadataCache.getFirstLinkpathDest(cleanLink, '');
      if (file && file instanceof TFile && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(file.extension.toLowerCase())) {
        try {
            const binary = await this.app.vault.readBinary(file);
            const base64 = this.arrayBufferToBase64(binary);
            const mimeType = this.getMimeType(file.extension);
            images.push(`data:${mimeType};base64,${base64}`);
        } catch (e) {
            console.error('Failed to read image:', cleanLink, e);
        }
      }
    }
    return images;
  }

  arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  getMimeType(extension: string): string {
    switch (extension.toLowerCase()) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      default: return 'image/jpeg';
    }
  }

  onunload() {
  }
}
