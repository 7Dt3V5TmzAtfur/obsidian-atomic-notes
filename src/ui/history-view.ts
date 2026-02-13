import { ItemView, WorkspaceLeaf, Notice, setIcon, TFile } from 'obsidian';
import AtomicNotesPlugin from '../main';
import { DecompositionHistoryItem } from '../types';

export const VIEW_TYPE_ATOMIC_HISTORY = 'atomic_notes_history';

export class AtomicHistoryView extends ItemView {
    plugin: AtomicNotesPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: AtomicNotesPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_ATOMIC_HISTORY;
    }

    getDisplayText() {
        return 'Atomic Decomposition History';
    }

    getIcon() {
        return 'history';
    }

    async onOpen() {
        this.render();
    }

    async render() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl('h4', { text: 'Decomposition History' });

        const history = this.plugin.settings.history || [];

        if (history.length === 0) {
            container.createEl('p', { text: 'No history yet.', cls: 'history-empty-state' }).style.color = 'var(--text-muted)';
            return;
        }

        // Group by Date
        const groupedHistory: { [key: string]: DecompositionHistoryItem[] } = {};
        history.sort((a, b) => b.timestamp - a.timestamp).forEach(item => {
            const date = new Date(item.timestamp).toLocaleDateString();
            if (!groupedHistory[date]) groupedHistory[date] = [];
            groupedHistory[date].push(item);
        });

        // Render List
        for (const date in groupedHistory) {
            container.createEl('div', { text: date, cls: 'history-date-header' }).style.fontWeight = 'bold';

            const list = container.createEl('div', { cls: 'history-list' });
            list.style.display = 'flex';
            list.style.flexDirection = 'column';
            list.style.gap = '10px';
            list.style.marginBottom = '15px';

            groupedHistory[date].forEach(item => {
                const card = list.createDiv({ cls: 'history-item' });
                Object.assign(card.style, {
                    border: '1px solid var(--background-modifier-border)',
                    borderRadius: '5px',
                    padding: '10px',
                    backgroundColor: 'var(--background-secondary)'
                });

                const header = card.createDiv({ cls: 'history-item-header' });
                header.style.display = 'flex';
                header.style.justifyContent = 'space-between';
                header.style.marginBottom = '5px';

                const title = header.createEl('span', { text: item.originalNotePath.split('/').pop() || 'Untitled' });
                title.style.fontWeight = '600';

                const time = header.createEl('span', { text: new Date(item.timestamp).toLocaleTimeString() });
                time.style.fontSize = '0.8em';
                time.style.color = 'var(--text-muted)';

                const details = card.createDiv({ cls: 'history-item-details' });
                details.setText(`${item.cardsGenerated} cards generated · ${item.status}`);
                details.style.fontSize = '0.9em';
                details.style.marginBottom = '8px';

                // Actions
                const actions = card.createDiv({ cls: 'history-actions' });
                actions.style.display = 'flex';
                actions.style.gap = '8px';

                const viewBtn = actions.createEl('button', { text: 'View Cards' });
                viewBtn.onclick = () => {
                    // Navigate to the folder of generated cards
                    // Assuming default naming convention {note}-atomic
                    const noteName = item.originalNotePath.split('/').pop()?.replace('.md', '');
                    const folderPath = this.plugin.settings.defaultFolder
                        ? `${this.plugin.settings.defaultFolder}/${noteName}-atomic`
                        : `${noteName}-atomic`; // Approximation, might need more robust path storing in history

                    // Simple check if folder exists
                    if (this.plugin.app.vault.getAbstractFileByPath(folderPath)) {
                        // Open file explorer (not easy via API), or just notify
                        new Notice(`Cards are in: ${folderPath}`);
                        // Ideally we could focus on the folder in file explorer
                    } else {
                        new Notice('Folder not found');
                    }
                };

                const undoBtn = actions.createEl('button', { text: 'Undo' });
                undoBtn.onclick = async () => {
                    // This is a simplified undo trigger.
                    // Real implementation requires linking history ID to UndoService transaction ID
                    // For now, we just call the latest undo if matches?
                    // Or better, just show notice that "Use Command Palette > Undo Generation"
                    new Notice('Please use "Undo Generation" command for the latest action.');
                    // Future: pass item.id to undo service
                };
            });
        }
    }

    async onClose() {
        // cleanup
    }
}
