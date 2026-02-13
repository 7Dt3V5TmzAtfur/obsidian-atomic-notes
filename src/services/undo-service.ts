import { App, TFile, Notice } from 'obsidian';

export interface FileOperation {
  type: 'create' | 'modify';
  path: string;
  // For 'modify', this is the content BEFORE modification (for Undo)
  // For 'create' in Redo, this is the content to recreate.
  previousContent?: string;
}

export class UndoService {
  private app: App;
  private undoStack: FileOperation[][] = [];
  private redoStack: FileOperation[][] = [];

  constructor(app: App) {
    this.app = app;
  }

  addTransaction(operations: FileOperation[]) {
    if (operations.length === 0) return;
    this.undoStack.push(operations);
    this.redoStack = []; // Clear redo stack when new action occurs
  }

  async undo() {
    const operations = this.undoStack.pop();
    if (!operations) {
      new Notice('没有可撤销的操作');
      return;
    }

    const redoOps: FileOperation[] = [];
    // Reverse operations to undo in reverse order (LIFO)
    const reversedOps = [...operations].reverse();

    let successCount = 0;

    for (const op of reversedOps) {
      try {
        if (op.type === 'create') {
          // Undo Create -> Delete file
          const file = this.app.vault.getAbstractFileByPath(op.path);
          if (file instanceof TFile) {
            // Read content for Redo (to be able to recreate it)
            const content = await this.app.vault.read(file);
            redoOps.push({ type: 'create', path: op.path, previousContent: content });

            await this.app.vault.delete(file);
            successCount++;
          } else {
             // File doesn't exist? Maybe already deleted.
             // We still might want to push a redo op if we assume it was there?
             // No, if we didn't delete it, we can't recreate it cleanly.
          }
        } else if (op.type === 'modify') {
          // Undo Modify -> Restore previous content
          const file = this.app.vault.getAbstractFileByPath(op.path);
          if (file instanceof TFile && op.previousContent !== undefined) {
            // Save current content for Redo
            const currentContent = await this.app.vault.read(file);
            redoOps.push({ type: 'modify', path: op.path, previousContent: currentContent });

            await this.app.vault.modify(file, op.previousContent);
            successCount++;
          }
        }
      } catch (err) {
        console.error(`Undo failed for ${op.path}`, err);
      }
    }

    if (redoOps.length > 0) {
      this.redoStack.push(redoOps);
    }

    new Notice(`已撤销 ${successCount} 个文件操作`);
  }

  async redo() {
    const operations = this.redoStack.pop();
    if (!operations) {
      new Notice('没有可重做的操作');
      return;
    }

    const undoOps: FileOperation[] = [];
    let successCount = 0;

    for (const op of operations) {
      try {
        if (op.type === 'create') {
          // Redo Create -> Re-create file with content
          if (op.previousContent !== undefined) {
             // Check if file exists to avoid error?
             const existing = this.app.vault.getAbstractFileByPath(op.path);
             if (!existing) {
                await this.app.vault.create(op.path, op.previousContent);
                undoOps.push({ type: 'create', path: op.path });
                successCount++;
             }
          }
        } else if (op.type === 'modify') {
          // Redo Modify -> Update content
          const file = this.app.vault.getAbstractFileByPath(op.path);
          if (file instanceof TFile && op.previousContent !== undefined) {
            const currentContent = await this.app.vault.read(file);
            undoOps.push({ type: 'modify', path: op.path, previousContent: currentContent });

            await this.app.vault.modify(file, op.previousContent);
            successCount++;
          }
        }
      } catch (err) {
         console.error(`Redo failed for ${op.path}`, err);
      }
    }

    if (undoOps.length > 0) {
      this.undoStack.push(undoOps);
    }

    new Notice(`已重做 ${successCount} 个文件操作`);
  }
}
