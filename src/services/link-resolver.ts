import { TFile, Vault } from 'obsidian';

const SIMILARITY_THRESHOLD = 0.3;
const EXACT_MATCH_THRESHOLD = 0.9;

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
    }
  }

  async rebuildIndex() {
    this.noteIndex.clear();
    await this.buildIndex();
  }

  /**
   * 查找与给定概念最匹配的笔记（使用模糊搜索）
   */
  findMatches(concept: string): string[] {
    const conceptLower = concept.toLowerCase().trim();
    if (!conceptLower) return [];

    const matches: Array<{ file: TFile; score: number }> = [];

    // 精确匹配优先
    if (this.noteIndex.has(conceptLower)) {
      return [this.noteIndex.get(conceptLower)!.basename];
    }

    // 模糊匹配打分
    for (const [name, file] of this.noteIndex) {
      const score = this.calculateSimilarity(conceptLower, name);

      // 只保留相似度 > 阈值 的结果
      if (score > SIMILARITY_THRESHOLD) {
        matches.push({ file, score });
      }
    }

    // 按分数降序排序，返回前3个
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(m => m.file.basename);
  }

  /**
   * 计算两个字符串的相似度（0-1）
   * 使用简化的 Levenshtein 距离算法
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // 完全包含关系得分最高
    if (str2.includes(str1) || str1.includes(str2)) {
      return EXACT_MATCH_THRESHOLD;
    }

    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);

    // Performance optimization:
    // If length difference is too large, similarity will definitely be low
    // For Levenshtein distance: distance >= abs(len1 - len2)
    // Similarity = 1 - distance / maxLen
    // If we want Similarity > THRESHOLD, then:
    // 1 - abs(len1 - len2)/maxLen > THRESHOLD
    // abs(len1 - len2)/maxLen < 1 - THRESHOLD
    if (maxLen > 0 && Math.abs(len1 - len2) / maxLen > (1 - SIMILARITY_THRESHOLD)) {
        return 0;
    }

    // 单词级别匹配
    const words1 = str1.split(/[\s\-_]+/);
    const words2 = str2.split(/[\s\-_]+/);

    let matchedWords = 0;
    for (const w1 of words1) {
      if (words2.some(w2 => w2.includes(w1) || w1.includes(w2))) {
        matchedWords++;
      }
    }

    if (matchedWords > 0) {
      return 0.5 + (matchedWords / Math.max(words1.length, words2.length)) * 0.4;
    }

    // 字符级别相似度
    const distance = this.levenshteinDistance(str1, str2);
    return Math.max(0, 1 - distance / maxLen);
  }

  /**
   * Levenshtein 编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 验证概念列表，返回实际匹配的笔记名
   */
  validateConcepts(concepts: string[]): string[] {
    const validated: string[] = [];

    for (const concept of concepts) {
      const matches = this.findMatches(concept);
      if (matches.length > 0) {
        // 使用最佳匹配的笔记名
        validated.push(matches[0]);
      }
    }

    // 去重
    return Array.from(new Set(validated));
  }
}
