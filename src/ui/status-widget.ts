import { App, Notice, Plugin } from 'obsidian';

export class StatusWidget {
    private app: App;
    private statusBarItem: HTMLElement;
    private floatingWidget: HTMLElement | null = null;
    private progressBar: HTMLElement | null = null;
    private statusText: HTMLElement | null = null;
    private isVisible: boolean = false;

    constructor(app: App, plugin: Plugin) {
        this.app = app;
        this.statusBarItem = plugin.addStatusBarItem();
        this.updateStatusBar('idle');
    }

    updateStatusBar(status: 'idle' | 'processing' | 'complete' | 'error', message?: string) {
        if (status === 'idle') {
            this.statusBarItem.setText('');
            this.statusBarItem.hide();
        } else {
            this.statusBarItem.show();
            let icon = '';
            if (status === 'processing') icon = '⏳ ';
            if (status === 'complete') icon = '✅ ';
            if (status === 'error') icon = '❌ ';

            this.statusBarItem.setText(`${icon}${message || 'Atomic Notes'}`);
        }
    }

    showFloatingWidget(title: string) {
        if (this.floatingWidget) return;

        // Create container
        this.floatingWidget = document.body.createDiv('atomic-status-widget');
        Object.assign(this.floatingWidget.style, {
            position: 'absolute',
            top: '50px',
            right: '20px',
            width: '300px',
            backgroundColor: 'var(--background-secondary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '8px',
            padding: '12px',
            zIndex: '1000',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        });

        // Title row
        const header = this.floatingWidget.createDiv({ cls: 'status-header' });
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';

        header.createEl('span', { text: title, cls: 'status-title' }).style.fontWeight = 'bold';

        // Close button (only useful if we want to dismiss manually, but we usually auto-dismiss)
        // const closeBtn = header.createEl('div', { text: '✕' });
        // closeBtn.style.cursor = 'pointer';
        // closeBtn.onclick = () => this.hideFloatingWidget();

        // Status Text
        this.statusText = this.floatingWidget.createDiv({ cls: 'status-text', text: 'Preparing...' });
        this.statusText.style.fontSize = '0.9em';
        this.statusText.style.color = 'var(--text-muted)';

        // Progress Bar Container
        const progressContainer = this.floatingWidget.createDiv({ cls: 'progress-container' });
        Object.assign(progressContainer.style, {
            height: '6px',
            backgroundColor: 'var(--background-modifier-border)',
            borderRadius: '3px',
            overflow: 'hidden',
            marginTop: '4px'
        });

        // Progress Bar
        this.progressBar = progressContainer.createDiv({ cls: 'progress-bar' });
        Object.assign(this.progressBar.style, {
            width: '0%',
            height: '100%',
            backgroundColor: 'var(--interactive-accent)',
            transition: 'width 0.3s ease'
        });

        this.isVisible = true;
    }

    updateProgress(percent: number, message?: string, status: 'processing' | 'complete' | 'error' = 'processing') {
        // Update Status Bar
        this.updateStatusBar(status, message ? `${message} (${percent}%)` : undefined);

        // Update Floating Widget
        if (!this.floatingWidget) {
            this.showFloatingWidget('Atomic Decomposition');
        }

        if (this.progressBar) {
            this.progressBar.style.width = `${percent}%`;
            if (status === 'error') this.progressBar.style.backgroundColor = 'var(--background-modifier-error)';
            else if (status === 'complete') this.progressBar.style.backgroundColor = 'var(--interactive-success)';
            else this.progressBar.style.backgroundColor = 'var(--interactive-accent)';
        }

        if (this.statusText && message) {
            this.statusText.setText(message);
        }
    }

    hideFloatingWidget(delay: number = 0) {
        if (!this.floatingWidget) return;

        const widget = this.floatingWidget; // capture reference
        this.floatingWidget = null;
        this.progressBar = null;
        this.statusText = null;
        this.isVisible = false;

        this.updateStatusBar('idle');

        if (delay > 0) {
            setTimeout(() => {
                widget.remove();
            }, delay);
        } else {
            widget.remove();
        }
    }
}
