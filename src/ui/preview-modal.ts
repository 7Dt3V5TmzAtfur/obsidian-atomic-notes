import { Modal, App, Setting } from 'obsidian';
import { AtomicCard } from '../types';

export class PreviewModal extends Modal {
  private cards: AtomicCard[];
  private currentIndex: number = 0;
  private onAccept: (cards: AtomicCard[]) => void;
  private cardContentEl: HTMLElement;
  private cardListEl: HTMLElement;

  constructor(
    app: App,
    cards: AtomicCard[],
    onAccept: (cards: AtomicCard[]) => void
  ) {
    super(app);
    this.cards = [...cards]; // 复制数组，避免直接修改原数组
    this.onAccept = onAccept;
  }

  onOpen() {
    const { contentEl, modalEl } = this;

    // 直接设置模态框尺寸
    modalEl.style.width = '90vw';
    modalEl.style.maxWidth = '1400px';
    modalEl.style.height = '90vh';

    contentEl.empty();
    contentEl.addClass('atomic-notes-preview');

    // 标题区域
    const headerEl = contentEl.createDiv('atomic-notes-preview-header');
    headerEl.createEl('h2', { text: '📝 拆解结果预览' });
    headerEl.createEl('p', {
      text: `共识别到 ${this.cards.length} 个原子概念`,
      cls: 'atomic-notes-summary',
    });

    // 主体区域（左右布局）
    const mainContainer = contentEl.createDiv('atomic-notes-preview-main');

    // 左侧：卡片列表
    const leftPanel = mainContainer.createDiv('atomic-notes-preview-left');
    leftPanel.createEl('h3', { text: '卡片列表' });
    this.cardListEl = leftPanel.createDiv('atomic-notes-card-list');
    this.renderCardList();

    // 右侧：卡片详情
    const rightPanel = mainContainer.createDiv('atomic-notes-preview-right');
    rightPanel.createEl('h3', { text: '卡片详情' });
    this.cardContentEl = rightPanel.createDiv('atomic-notes-card-detail');
    this.renderCardDetail();

    // 底部：操作按钮
    const buttonContainer = contentEl.createDiv('atomic-notes-buttons');
    new Setting(buttonContainer)
      .addButton(btn => btn
        .setButtonText('取消')
        .onClick(() => this.close())
      )
      .addButton(btn => btn
        .setButtonText('全部接受')
        .setCta()
        .onClick(() => {
          if (this.cards.length === 0) {
            return;
          }
          this.onAccept(this.cards);
          this.close();
        })
      );
  }

  private renderCardList() {
    if (!this.cardListEl) return;
    this.cardListEl.empty();

    if (this.cards.length === 0) {
      this.cardListEl.createEl('p', {
        text: '所有卡片已被移除',
        cls: 'atomic-notes-empty'
      });
      return;
    }

    this.cards.forEach((card, index) => {
      const item = this.cardListEl.createDiv('atomic-notes-card-item');
      if (index === this.currentIndex) {
        item.addClass('active');
      }

      // 卡片序号
      item.createEl('span', {
        text: `${index + 1}`,
        cls: 'card-number'
      });

      // 标签徽章
      const tagBadge = item.createEl('span', {
        text: card.tags[0],
        cls: 'tag-badge',
      });

      // 卡片标题
      const titleEl = item.createEl('span', {
        text: card.title,
        cls: 'card-title'
      });

      // 点击切换卡片
      item.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).classList.contains('card-remove')) {
          this.currentIndex = index;
          this.renderCardList();
          this.renderCardDetail();
        }
      });

      // 删除按钮
      const removeBtn = item.createEl('span', {
        text: '×',
        cls: 'card-remove',
      });
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cards.splice(index, 1);
        if (this.currentIndex >= this.cards.length) {
          this.currentIndex = Math.max(0, this.cards.length - 1);
        }
        this.renderCardList();
        this.renderCardDetail();
      });
    });
  }

  private renderCardDetail() {
    if (!this.cardContentEl) return;
    this.cardContentEl.empty();

    if (this.cards.length === 0) {
      this.cardContentEl.createEl('p', {
        text: '没有可显示的卡片',
        cls: 'atomic-notes-empty'
      });
      return;
    }

    const card = this.cards[this.currentIndex];
    if (!card) return;

    // 卡片标题
    this.cardContentEl.createEl('h3', { text: card.title });

    // Description
    const descSection = this.cardContentEl.createDiv('detail-section');
    descSection.createEl('h4', { text: '📄 简述' });
    descSection.createEl('p', { text: card.description });

    // Tags
    const tagsSection = this.cardContentEl.createDiv('detail-section');
    tagsSection.createEl('h4', { text: '🏷️ 标签' });
    const tagsContainer = tagsSection.createDiv('tags-container');
    card.tags.forEach(tag => {
      tagsContainer.createEl('span', { text: tag, cls: 'tag' });
    });

    // Content
    const contentSection = this.cardContentEl.createDiv('detail-section');
    contentSection.createEl('h4', { text: '📝 内容' });
    contentSection.createEl('p', { text: card.content, cls: 'card-content-text' });

    // Explanation
    const explanationSection = this.cardContentEl.createDiv('detail-section');
    explanationSection.createEl('h4', { text: '💡 说明' });
    explanationSection.createEl('p', { text: card.explanation });

    // Relations
    if (card.relations && card.relations.length > 0) {
      const relationsSection = this.cardContentEl.createDiv('detail-section');
      relationsSection.createEl('h4', { text: '🔗 关联笔记' });
      const relContainer = relationsSection.createDiv('relations-container');
      card.relations.forEach(rel => {
        relContainer.createEl('code', { text: `[[${rel}]]`, cls: 'relation-link' });
      });
    }

    // Position
    if (card.position && (card.position.parent || (card.position.children && card.position.children.length > 0))) {
      const positionSection = this.cardContentEl.createDiv('detail-section');
      positionSection.createEl('h4', { text: '📍 知识位置' });

      if (card.position.parent) {
        const parentEl = positionSection.createDiv('position-item');
        parentEl.createEl('span', { text: '↑ 向上追溯: ', cls: 'position-label' });
        parentEl.createEl('code', { text: `[[${card.position.parent}]]` });
      }

      if (card.position.children && card.position.children.length > 0) {
        const childrenEl = positionSection.createDiv('position-item');
        childrenEl.createEl('span', { text: '↓ 向下拆解: ', cls: 'position-label' });
        const childrenContainer = childrenEl.createSpan();
        card.position.children.forEach((child, idx) => {
          childrenContainer.createEl('code', { text: `[[${child}]]` });
          if (idx < card.position.children!.length - 1) {
            childrenContainer.createSpan({ text: ', ' });
          }
        });
      }
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
