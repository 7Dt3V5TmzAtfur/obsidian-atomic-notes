import { TFile, Vault } from 'obsidian';

export class LinkResolver {
  private vault: Vault;
  private noteIndex: Map<string, TFile> = new Map();

  constructor(vault: Vault) {
    this.vault = vault;
    this.buildIndex();
  }

  private async buildIndex() {
    const files = this.vault.getMarkdownFiles();

    for (const file of files) {
      // 索引文件名（不含扩展名）
      const basename = file.basename.toLowerCase();
      this.noteIndex.set(basename, file);

      // TODO: 索引文件内的标题和标签
    }
  }

  async rebuildIndex() {
    this.noteIndex.clear();
    await this.buildIndex();
  }

  /**
   * 查找与给定概念最匹配的笔记
   */
  findMatches(concept: string): string[] {
    const conceptLower = concept.toLowerCase();
    const matches: string[] = [];

    // 精确匹配
    if (this.noteIndex.has(conceptLower)) {
      matches.push(this.noteIndex.get(conceptLower)!.basename);
    }

    // 模糊匹配（包含关系）
    for (const [name, file] of this.noteIndex) {
      if (name.includes(conceptLower) || conceptLower.includes(name)) {
        if (!matches.includes(file.basename)) {
          matches.push(file.basename);
        }
      }
    }

    return matches.slice(0, 3); // 最多返回3个匹配
  }

  /**
   * 验证概念列表，过滤不存在的笔记
   */
  validateConcepts(concepts: string[]): string[] {
    return concepts.filter(concept => {
      const matches = this.findMatches(concept);
      return matches.length > 0;
    });
  }
}
