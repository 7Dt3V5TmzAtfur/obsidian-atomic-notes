import { Modal, App } from 'obsidian';

export class ProgressModal extends Modal {
  private statusEl: HTMLElement;
  private progressEl: HTMLElement;
  private progressBarContainer: HTMLElement;
  private percentEl: HTMLElement;

  // Batch processing state
  private isBatch: boolean = false;
  private totalFiles: number = 0;
  private currentFileIndex: number = 0;
  private batchStatusEl: HTMLElement;

  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('atomic-notes-progress-modal');

    // 标题
    contentEl.createEl('h2', { text: '🧩 正在拆解笔记' });

    // 批量处理状态 (默认为空，启用时显示)
    this.batchStatusEl = contentEl.createDiv({ cls: 'atomic-notes-batch-status' });
    this.batchStatusEl.style.display = 'none';
    this.batchStatusEl.style.marginBottom = '12px';
    this.batchStatusEl.style.fontWeight = 'bold';
    this.batchStatusEl.style.color = 'var(--text-accent)';

    // 状态文字
    this.statusEl = contentEl.createEl('p', {
      text: '正在分析笔记结构...',
      cls: 'atomic-notes-status',
    });

    // 进度条容器
    this.progressBarContainer = contentEl.createDiv('atomic-notes-progress-container');
    this.progressEl = this.progressBarContainer.createDiv('atomic-notes-progress-bar');
    this.progressEl.style.width = '0%';

    // 百分比显示
    this.percentEl = contentEl.createEl('p', {
      text: '0%',
      cls: 'atomic-notes-percent',
    });
  }

  setBatchMode(total: number) {
    this.isBatch = true;
    this.totalFiles = total;
    this.currentFileIndex = 0;
    if (this.batchStatusEl) {
      this.batchStatusEl.style.display = 'block';
      this.updateBatchStatus();
    }
  }

  nextFile(fileName: string) {
    this.currentFileIndex++;
    this.updateBatchStatus(fileName);
    this.updateProgress(0, '准备处理...');
  }

  private updateBatchStatus(fileName?: string) {
    if (this.batchStatusEl) {
      const nameText = fileName ? ` - ${fileName}` : '';
      this.batchStatusEl.setText(`批量处理进度: ${this.currentFileIndex}/${this.totalFiles} 篇${nameText}`);
    }
  }

  updateProgress(percent: number, customStatus?: string) {
    // 根据进度百分比自动选择阶段文字
    let status = customStatus || this.getStageMessage(percent);

    if (this.statusEl) {
      this.statusEl.setText(status);
    }
    if (this.progressEl) {
      // 添加平滑过渡动画
      this.progressEl.style.transition = 'width 0.3s ease-in-out';
      this.progressEl.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
    if (this.percentEl) {
      this.percentEl.setText(`${Math.round(percent)}%`);
    }
  }

  private getStageMessage(percent: number): string {
    if (percent < 30) {
      return '正在分析笔记结构...';
    } else if (percent < 60) {
      return '正在识别核心概念...';
    } else if (percent < 90) {
      return '正在建立关联...';
    } else if (percent < 100) {
      return '正在生成卡片...';
    } else {
      return '完成！';
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
