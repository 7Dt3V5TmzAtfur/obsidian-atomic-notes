import { Modal, App } from 'obsidian';

export class ProgressModal extends Modal {
  private statusEl: HTMLElement;
  private progressEl: HTMLElement;

  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: '🧩 拆解中...' });

    this.statusEl = contentEl.createEl('p', {
      text: '正在分析笔记结构...',
      cls: 'atomic-notes-status',
    });

    const progressContainer = contentEl.createDiv('atomic-notes-progress-container');
    this.progressEl = progressContainer.createDiv('atomic-notes-progress-bar');
    this.progressEl.style.width = '0%';
  }

  updateProgress(status: string, percent: number) {
    if (this.statusEl) {
      this.statusEl.setText(status);
    }
    if (this.progressEl) {
      this.progressEl.style.width = `${percent}%`;
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
