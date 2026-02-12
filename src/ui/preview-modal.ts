import { Modal, App, Setting } from 'obsidian';
import { AtomicCard } from '../types';

export class PreviewModal extends Modal {
  private cards: AtomicCard[];
  private currentIndex: number = 0;
  private onAccept: (cards: AtomicCard[]) => void;
  private cardContentEl: HTMLElement;

  constructor(
    app: App,
    cards: AtomicCard[],
    onAccept: (cards: AtomicCard[]) => void
  ) {
    super(app);
    this.cards = cards;
    this.onAccept = onAccept;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('atomic-notes-preview');

    // 标题
    contentEl.createEl('h2', { text: '拆解结果预览' });
    contentEl.createEl('p', {
      text: `共识别到 ${this.cards.length} 个原子概念`,
      cls: 'atomic-notes-summary',
    });

    // 卡片列表
    const listContainer = contentEl.createDiv('atomic-notes-card-list');
    this.cards.forEach((card, index) => {
      const item = listContainer.createDiv('atomic-notes-card-item');
      if (index === this.currentIndex) {
        item.addClass('active');
      }

      const checkbox = item.createEl('input', { type: 'checkbox' });
      checkbox.checked = true;
      checkbox.addEventListener('change', () => {
        if (!checkbox.checked) {
          this.cards.splice(index, 1);
          this.render();
        }
      });

      const tagBadge = item.createEl('span', {
        text: card.tags[0],
        cls: `tag-badge tag-${card.tags[0]}`,
      });

      const title = item.createEl('span', { text: card.title });

      item.addEventListener('click', () => {
        this.currentIndex = index;
        this.render();
      });
    });

    // 卡片详情
    this.cardContentEl = contentEl.createDiv('atomic-notes-card-detail');
    this.renderCardDetail();

    // 操作按钮
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
          this.onAccept(this.cards);
          this.close();
        })
      );
  }

  private renderCardDetail() {
    if (!this.cardContentEl) return;

    this.cardContentEl.empty();

    const card = this.cards[this.currentIndex];
    if (!card) return;

    // 卡片标题
    this.cardContentEl.createEl('h3', { text: card.title });

    // Description
    const desc = this.cardContentEl.createDiv('card-description');
    desc.createEl('strong', { text: 'Description: ' });
    desc.createSpan({ text: card.description });

    // Tags
    const tags = this.cardContentEl.createDiv('card-tags');
    tags.createEl('strong', { text: 'Tags: ' });
    card.tags.forEach(tag => {
      tags.createEl('span', { text: tag, cls: 'tag' });
    });

    // Content
    const content = this.cardContentEl.createDiv('card-content');
    content.createEl('strong', { text: '内容: ' });
    content.createEl('p', { text: card.content });

    // Explanation
    const explanation = this.cardContentEl.createDiv('card-explanation');
    explanation.createEl('strong', { text: '说明: ' });
    explanation.createSpan({ text: card.explanation });

    // Relations
    if (card.relations.length > 0) {
      const relations = this.cardContentEl.createDiv('card-relations');
      relations.createEl('strong', { text: '关联: ' });
      card.relations.forEach(rel => {
        relations.createEl('code', { text: `[[${rel}]]` });
      });
    }

    // Position
    if (card.position.parent || card.position.children) {
      const position = this.cardContentEl.createDiv('card-position');
      position.createEl('strong', { text: '位置: ' });
      if (card.position.parent) {
        position.createEl('p', { text: `↑ ${card.position.parent}` });
      }
      if (card.position.children) {
        position.createEl('p', {
          text: `↓ ${card.position.children.join(', ')}`,
        });
      }
    }
  }

  private render() {
    this.onOpen();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
