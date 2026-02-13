import { Modal, App, Setting, TextAreaComponent, ButtonComponent, Notice, setIcon } from 'obsidian';
import { AtomicCard, CardTag } from '../types';

export class PreviewModal extends Modal {
  private cards: AtomicCard[];
  private currentIndex: number = 0;
  private onAccept: (cards: AtomicCard[]) => void;
  private cardContentEl: HTMLElement;
  private cardListEl: HTMLElement;
  private importBtn: ButtonComponent;

  constructor(
    app: App,
    cards: AtomicCard[],
    onAccept: (cards: AtomicCard[]) => void
  ) {
    super(app);
    // Deep copy and initialize selected state to true
    this.cards = JSON.parse(JSON.stringify(cards)).map((c: AtomicCard) => ({
        ...c,
        selected: true
    }));
    this.onAccept = onAccept;
  }

  onOpen() {
    const { contentEl, modalEl } = this;

    // 1. Inject Dynamic Styles (Invisible UI)
    this.injectStyles();

    // 2. Configure Modal Dimensions
    modalEl.addClass('atomic-notes-modal');
    modalEl.style.width = '90vw';
    modalEl.style.maxWidth = '95vw'; // Allow it to be wider on large screens
    modalEl.style.height = '85vh';

    contentEl.empty();
    contentEl.addClass('atomic-notes-preview');

    // 3. Header Section
    const headerEl = contentEl.createDiv('atomic-notes-header');
    const headerTitle = headerEl.createEl('div', { cls: 'header-title-group' });
    headerTitle.createEl('h2', { text: 'Atomic Workbench' });
    headerTitle.createEl('span', {
        text: `${this.cards.length} cards`,
        cls: 'atomic-header-badge'
    });

    // 4. Main Layout (Sidebar + Editor)
    const mainContainer = contentEl.createDiv('atomic-notes-layout');

    // Left Sidebar: Card List
    const leftPanel = mainContainer.createDiv('atomic-sidebar');
    this.cardListEl = leftPanel.createDiv('atomic-card-list');

    // Right Panel: Editor (Document Metaphor)
    const rightPanel = mainContainer.createDiv('atomic-editor-panel');
    this.cardContentEl = rightPanel.createDiv('atomic-document');

    // Initial Render
    this.renderCardList();
    this.renderCardDetail();

    // 5. Footer Actions
    const footer = contentEl.createDiv('atomic-footer');

    // Batch Selection Controls (Left)
    const footerLeft = footer.createDiv('footer-left');
    footerLeft.style.display = 'flex';
    footerLeft.style.gap = '8px';
    footerLeft.style.marginRight = 'auto'; // Push others to right

    new ButtonComponent(footerLeft)
        .setButtonText('Select All')
        .onClick(() => {
            this.cards.forEach(c => c.selected = true);
            this.renderCardList();
            this.updateImportButton();
        });

    new ButtonComponent(footerLeft)
        .setButtonText('Deselect All')
        .onClick(() => {
            this.cards.forEach(c => c.selected = false);
            this.renderCardList();
            this.updateImportButton();
        });

    // Action Buttons (Right)
    new ButtonComponent(footer)
        .setButtonText('Cancel')
        .onClick(() => this.close());

    this.importBtn = new ButtonComponent(footer)
        .setButtonText(`Import Selected (${this.cards.length})`)
        .setCta()
        .onClick(() => {
          const selectedCards = this.cards.filter(c => c.selected);
          if (selectedCards.length === 0) {
            new Notice('No cards selected');
            return;
          }
          this.onAccept(selectedCards);
          this.close();
        });
  }

  private injectStyles() {
    const styleId = 'atomic-modal-styles';
    // Remove existing if any to ensure update
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();

    const styleTag = document.createElement('style');
    styleTag.id = styleId;
    styleTag.textContent = `
      /* Layout & Reset */
      .atomic-notes-modal .modal-content {
        display: flex;
        flex-direction: column;
        padding: 0;
        overflow: hidden;
        background-color: var(--background-primary);
      }

      .atomic-notes-preview {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      /* Header */
      .atomic-notes-header {
        padding: 16px 24px;
        border-bottom: 1px solid var(--background-modifier-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background-color: var(--background-primary);
        flex-shrink: 0;
      }

      .header-title-group {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .atomic-notes-header h2 {
        margin: 0;
        font-size: 1.1em;
        font-weight: 600;
        color: var(--text-normal);
      }

      .atomic-header-badge {
        font-size: 0.75em;
        padding: 2px 8px;
        border-radius: 10px;
        background-color: var(--background-secondary-alt);
        color: var(--text-muted);
      }

      /* Main Layout */
      .atomic-notes-layout {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      /* Sidebar */
      .atomic-sidebar {
        width: 300px;
        background-color: var(--background-secondary);
        border-right: 1px solid var(--background-modifier-border);
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
      }

      .atomic-card-list {
        overflow-y: auto;
        padding: 12px;
        flex: 1;
      }

      .atomic-card-item {
        padding: 10px 12px;
        margin-bottom: 4px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-muted);
      }

      .atomic-card-item:hover {
        background-color: var(--background-modifier-hover);
        color: var(--text-normal);
      }

      .atomic-card-item.active {
        background-color: var(--background-primary);
        color: var(--text-normal);
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        font-weight: 500;
      }

      .atomic-card-checkbox {
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
      }

      .atomic-card-item .card-title {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        font-size: 0.9em;
      }

      .atomic-card-item.is-excluded .card-title {
        text-decoration: line-through;
        opacity: 0.6;
      }

      .card-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .atomic-card-item:hover .card-actions {
        opacity: 1;
      }

      .sidebar-icon-btn {
        padding: 4px;
        border-radius: 4px;
        color: var(--text-muted);
        cursor: pointer;
      }

      .sidebar-icon-btn:hover {
        background-color: var(--background-modifier-error);
        color: white;
      }

      /* Editor Panel */
      .atomic-editor-panel {
        flex: 1;
        overflow-y: auto;
        padding: 48px 10%;
        background-color: var(--background-primary);
        position: relative;
      }

      .atomic-document {
        max-width: 800px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      /* Invisible Inputs - The Core of Emotional Design */
      .atomic-invisible-input {
        background: transparent;
        border: 1px solid transparent;
        box-shadow: none;
        width: 100%;
        transition: all 0.2s ease;
        border-radius: 6px;
        color: var(--text-normal);
      }

      .atomic-invisible-input:focus {
        box-shadow: none !important;
        border-color: transparent !important;
        background-color: var(--background-secondary);
        padding-left: 12px;
        margin-left: -12px;
      }

      /* Title Styling */
      .atomic-title-input {
        font-size: 2.2em;
        font-weight: 700;
        line-height: 1.3;
        padding: 8px 0;
        font-family: var(--font-display, var(--font-interface));
      }

      /* Meta Data Section */
      .atomic-meta-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-bottom: 24px;
        border-bottom: 1px solid var(--background-modifier-border);
        margin-bottom: 8px;
      }

      .atomic-meta-row {
        display: flex;
        align-items: baseline;
        gap: 16px;
      }

      .atomic-meta-label {
        font-size: 0.75em;
        font-weight: 600;
        letter-spacing: 0.05em;
        color: var(--text-muted);
        width: 60px;
        text-transform: uppercase;
        flex-shrink: 0;
      }

      .atomic-meta-input {
        font-size: 0.95em;
        padding: 4px 0;
        color: var(--text-normal);
      }

      .atomic-meta-input::placeholder {
        color: var(--text-faint);
      }

      /* Content Area */
      .atomic-content-editor {
        font-family: var(--font-text);
        font-size: 1.1em;
        line-height: 1.7;
        min-height: 400px;
        width: 100%;
        resize: none;
        border: none !important;
        padding: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      .atomic-content-editor:focus {
        box-shadow: none !important;
        outline: none !important;
      }

      /* Toolbar */
      .card-toolbar {
        position: absolute;
        top: 24px;
        right: 48px;
        display: flex;
        gap: 8px;
        opacity: 0.5;
        transition: opacity 0.2s;
      }

      .card-toolbar:hover {
        opacity: 1;
      }

      .toolbar-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 6px;
        border-radius: 4px;
        color: var(--text-muted);
      }

      .toolbar-btn:hover {
        background-color: var(--background-modifier-hover);
        color: var(--text-normal);
      }

      .toolbar-btn.is-warning:hover {
        background-color: var(--background-modifier-error);
        color: white;
      }

      /* Footer */
      .atomic-footer {
        padding: 16px 24px;
        border-top: 1px solid var(--background-modifier-border);
        display: flex;
        align-items: center;
        gap: 12px;
        background-color: var(--background-secondary);
        flex-shrink: 0;
      }

      .footer-left {
        flex: 1;
      }

      /* Mobile Adaptation */
      @media (max-width: 768px) {
        .atomic-notes-modal {
          width: 100vw !important;
          height: 100vh !important;
          max-width: 100% !important;
          max-height: 100% !important;
          border-radius: 0 !important;
        }

        .atomic-notes-layout {
          flex-direction: column;
        }

        .atomic-sidebar {
          width: 100%;
          height: 120px;
          border-right: none;
          border-bottom: 1px solid var(--background-modifier-border);
        }

        .card-actions,
        .card-toolbar {
          opacity: 1 !important;
        }

        .atomic-invisible-input {
          border: 1px solid var(--background-modifier-border);
          background-color: var(--background-primary-alt);
        }

        .atomic-editor-panel {
          padding: 24px 16px;
        }

        .card-toolbar {
          right: 16px;
        }

        .atomic-footer {
           flex-direction: column;
           gap: 8px;
        }
        .footer-left {
           width: 100%;
           justify-content: space-between;
           margin-right: 0;
        }
      }
    `;
    document.head.appendChild(styleTag);
  }

  private renderCardList() {
    if (!this.cardListEl) return;
    this.cardListEl.empty();

    if (this.cards.length === 0) {
      this.cardListEl.createDiv({
        cls: 'empty-state-list',
        text: 'No cards'
      });
      return;
    }

    this.cards.forEach((card, index) => {
      const item = this.cardListEl.createDiv('atomic-card-item');
      if (index === this.currentIndex) {
        item.addClass('active');
      }
      if (!card.selected) {
        item.addClass('is-excluded');
      }

      // Checkbox
      const checkboxContainer = item.createDiv('atomic-card-checkbox');
      const checkbox = checkboxContainer.createEl('input', { type: 'checkbox' });
      checkbox.checked = card.selected !== false;
      checkbox.onclick = (e) => {
        e.stopPropagation();
        card.selected = checkbox.checked;
        this.updateImportButton();
        if (card.selected) {
            item.removeClass('is-excluded');
        } else {
            item.addClass('is-excluded');
        }
      };

      item.createEl('span', {
        text: card.title || 'Untitled',
        cls: 'card-title'
      });

      // Quick Delete Action
      const actions = item.createDiv('card-actions');
      const deleteBtn = actions.createDiv('sidebar-icon-btn');
      setIcon(deleteBtn, 'x');
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        this.deleteCard(index);
      };

      item.addEventListener('click', () => {
        this.currentIndex = index;
        this.renderCardList();
        this.renderCardDetail();
      });
    });
  }

  private updateImportButton() {
      if (!this.importBtn) return;
      const count = this.cards.filter(c => c.selected).length;
      this.importBtn.setButtonText(`Import Selected (${count})`);
      if (count === 0) {
          this.importBtn.setDisabled(true);
      } else {
          this.importBtn.setDisabled(false);
      }
  }

  private renderCardDetail() {
    this.cardContentEl.empty();

    if (this.cards.length === 0) {
      const emptyState = this.cardContentEl.createDiv('empty-state');
      emptyState.style.textAlign = 'center';
      emptyState.style.marginTop = '100px';
      emptyState.style.color = 'var(--text-muted)';
      emptyState.createEl('h3', { text: 'All Done' });
      emptyState.createEl('p', { text: 'No cards remaining to review.' });
      return;
    }

    const card = this.cards[this.currentIndex];

    // --- Toolbar (Top Right) ---
    const toolbar = this.cardContentEl.createDiv('card-toolbar');

    if (this.currentIndex < this.cards.length - 1) {
      const mergeBtn = toolbar.createEl('button', {
        cls: 'toolbar-btn',
        attr: { 'aria-label': 'Merge Down' }
      });
      setIcon(mergeBtn, 'arrow-down');
      mergeBtn.onclick = () => this.mergeDown();
    }

    const deleteBtn = toolbar.createEl('button', {
      cls: 'toolbar-btn is-warning',
      attr: { 'aria-label': 'Delete Card' }
    });
    setIcon(deleteBtn, 'trash-2');
    deleteBtn.onclick = () => this.deleteCard(this.currentIndex);


    // --- 1. Title Input (Huge, Bold) ---
    const titleContainer = this.cardContentEl.createDiv('atomic-title-container');
    const titleInput = titleContainer.createEl('input', {
        type: 'text',
        cls: 'atomic-invisible-input atomic-title-input',
        value: card.title,
        attr: { placeholder: 'Untitled Card' }
    });
    titleInput.addEventListener('input', (e) => {
        const val = (e.target as HTMLInputElement).value;
        card.title = val;
        // Debounce or live update sidebar? Live is fine for local.
        this.refreshListTitle(this.currentIndex, val);
    });

    // --- 2. Metadata Section (Tags, Description) ---
    const metaSection = this.cardContentEl.createDiv('atomic-meta-section');

    // Tags
    const tagsRow = metaSection.createDiv('atomic-meta-row');
    tagsRow.createEl('span', { text: 'TAGS', cls: 'atomic-meta-label' });
    const tagsInput = tagsRow.createEl('input', {
        type: 'text',
        cls: 'atomic-invisible-input atomic-meta-input',
        value: card.tags.join(', '),
        attr: { placeholder: 'concept, idea...' }
    });
    tagsInput.addEventListener('change', (e) => {
        const val = (e.target as HTMLInputElement).value;
        card.tags = (val.split(',').map(t => t.trim()).filter(t => t) as any) as CardTag[];
    });

    // Description
    const descRow = metaSection.createDiv('atomic-meta-row');
    descRow.createEl('span', { text: 'SUMMARY', cls: 'atomic-meta-label' });
    const descInput = descRow.createEl('input', {
        type: 'text',
        cls: 'atomic-invisible-input atomic-meta-input',
        value: card.description || '',
        attr: { placeholder: 'Brief description of this idea...' }
    });
    descInput.addEventListener('input', (e) => {
        card.description = (e.target as HTMLInputElement).value;
    });

    // --- 3. Main Content Editor ---
    const contentContainer = this.cardContentEl.createDiv('atomic-content-container');

    // Using TextAreaComponent to get some basic Obsidian behavior, but stripping styles
    const contentEditor = new TextAreaComponent(contentContainer);
    contentEditor.inputEl.addClass('atomic-content-editor');
    contentEditor.setValue(card.content);
    contentEditor.setPlaceholder('Write your atomic note here...');
    contentEditor.onChange((value) => {
        card.content = value;
    });

    // Auto-resize textarea roughly
    contentEditor.inputEl.rows = 12;
  }

  private refreshListTitle(index: number, title: string) {
    const items = this.cardListEl.querySelectorAll('.atomic-card-item');
    if (items[index]) {
      const titleSpan = items[index].querySelector('.card-title');
      if (titleSpan) titleSpan.textContent = title || 'Untitled';
    }
  }

  private deleteCard(index: number) {
    this.cards.splice(index, 1);
    if (this.currentIndex >= this.cards.length) {
      this.currentIndex = Math.max(0, this.cards.length - 1);
    }
    this.renderCardList();
    this.renderCardDetail();
    this.updateImportButton();
  }

  private mergeDown() {
    if (this.currentIndex >= this.cards.length - 1) return;

    const currentCard = this.cards[this.currentIndex];
    const nextCard = this.cards[this.currentIndex + 1];

    const spacer = '\\n\\n---\\n\\n';
    nextCard.content = `${currentCard.content}${spacer}${nextCard.content}`;

    const combinedTags = new Set([...nextCard.tags, ...currentCard.tags]);
    nextCard.tags = Array.from(combinedTags);

    this.cards.splice(this.currentIndex, 1);

    new Notice('Merged down successfully');
    this.renderCardList();
    this.renderCardDetail();
    this.updateImportButton();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    const styleTag = document.getElementById('atomic-modal-styles');
    if (styleTag) styleTag.remove();
  }
}
