# Atomic Notes - Obsidian 插件

> 将混乱笔记智能拆解为原子化知识卡片，自动建立关联

## ✨ 功能特性

- 🧩 **一键拆解**：右键菜单触发，自动将大段笔记拆分为 3-8 个原子卡片
- 🔗 **智能关联**：自动识别 Vault 中已存在的相关概念，建立双向链接
- 👀 **实时预览**：拆解前查看每张卡片，可单独调整或删除
- 🛡️ **容错设计**：保留原笔记，支持撤销，多次重试
- ⚡ **进度可见**：实时显示处理阶段（分析结构 → 识别概念 → 建立关联）

## 🚀 快速开始

### 1. 安装依赖

```bash
cd obsidian-atomic-notes
npm install
```

### 2. 配置 API Key

打开 Obsidian → 设置 → Atomic Notes → 输入你的 Anthropic API Key
*或选择 "Local (Ollama/LM Studio)" 使用本地模型*

获取 API Key：[Anthropic Console](https://console.anthropic.com/)

### 3. 开发模式

```bash
npm run dev
```

这会启动 esbuild watch 模式，自动编译 TypeScript 文件到 `main.js`。

### 4. 在 Obsidian 中测试

将项目文件夹链接到 Obsidian 的插件目录：

```bash
# Windows
mklink /D "%APPDATA%\Obsidian\plugins\atomic-notes" "C:\path\to\obsidian-atomic-notes"

# macOS/Linux
ln -s /path/to/obsidian-atomic-notes ~/.obsidian/plugins/atomic-notes
```

然后在 Obsidian 中：
1. 打开设置 → 第三方插件
2. 关闭安全模式
3. 启用 "Atomic Notes"

### 5. 使用插件

1. 打开任意笔记
2. 右键菜单 → "🧩 拆解为原子卡片"
3. 等待 AI 处理（显示进度）
4. 预览拆解结果
5. 点击"全部接受"生成卡片文件

## 📁 项目结构

```
src/
├── main.ts                    # 插件入口
├── settings.ts                # 设置页面
├── types/
│   └── index.ts               # 类型定义
├── services/
│   ├── llm-service.ts         # LLM API 调用
│   └── link-resolver.ts       # 概念关联搜索
└── ui/
    ├── preview-modal.ts       # 预览界面
    └── progress-modal.ts      # 进度显示
```

## 🔥 高级功能 (V7.0 Mobile First)

### 1. 📱 Mobile First (V7.0)
**Ideas strike anywhere. Now your tools are ready.**
- **Responsive Invisible UI**: 界面优雅适配触摸操作，Stacked Layout 让移动端操作如丝般顺滑。
- **Touch-Ready**: 优化触控热区与可见性，在手机上拆解笔记不再需要小心翼翼。

### 2. 🛡️ V6.0 Robustness
**坚如磐石的稳定性。**
- **Zero Hallucination Policy**: 严格的 JSON 校验，确保 AI 生成的数据结构绝对正确。
- **Performance**: 优化的链接解析算法 (O(1) fast path)，在大规模 Vault 中也能瞬间完成关联。
- **Type Safety**: 100% TypeScript 覆盖，消除运行时错误的隐患。

### 2. 👻 Invisible UI (隐形界面)
**界面消失了，只剩下你的想法。**
- 当你不操作时，所有的输入框边框、按钮都会自动隐身。
- 只有内容本身悬浮在背景之上，极大减少视觉噪音。
- 让你专注于"思考"和"阅读"，而不是"操作软件"。

### 2. 📄 Document Metaphor (文档隐喻)
**这不是表单，这是你的草稿纸。**
- 抛弃了传统的 "Label: Input" 数据库表单结构。
- 预览界面看起来就像一张白纸，或者一篇已经写好的文章。
- 这种自然的文档流让大脑保持在"写作模式"，而不是"填空模式"。

### 3. 🖱️ Click-to-Edit (点击即修)
**所见即所得的极致。**
- 想要修改标题？直接点击标题文字。
- 想要调整正文？直接点击正文段落。
- 没有繁琐的 "编辑" 按钮，交互直觉如呼吸般自然。

### 4. 🤖 本地智能 (Local Intelligence)
**隐私至上，零成本运行。**
- 支持连接本地运行的 Ollama 或 LM Studio。
- 你的笔记数据永远不出本机，完全掌控隐私。
- 在没有网络的环境下也能随时拆解笔记。

### 2. 🏷️ 智能标签 (Smart Context)
**让笔记自动归位。**
- AI 不仅拆解内容，还会读取 Vault 中现有的标签体系。
- 自动为新卡片推荐最相关的标签，保持知识库的整洁与一致性。
- 告别标签混乱，建立有序的知识网络。

### 3. 🔄 模板分享 (Share)
**不仅是工具，更是思维模型。**
- 觉得你的 "会议纪要拆解法" 很棒？现在可以一键导出分享。
- 导入社区大牛的 Prompt 模板，直接复用顶级的思维方式。
- 支持 JSON 格式的导入/导出。

### 4. 🎨 自定义 Prompt 模板 (Custom Templates)
不再局限于默认的拆解逻辑。
- 在设置中定义你自己的 Prompt。
- 针对不同类型的笔记（会议记录、读书笔记、代码片段）使用不同的拆解策略。

### 5. ✍️ 交互式编辑与合并 (Interactive Editing)
AI 只是助手，你才是主编。在生成卡片文件之前：
- **实时编辑**：直接修改卡片标题和内容，所见即所得。
- **向下合并 (Merge Down)**：发现两张卡片内容重复？点击合并按钮，将当前卡片内容追加到下一张，保持上下文连贯。

### 6. ⚡ 批量流水线 (Velocity)
积压了太多 "稍后阅读"？
1. 在文件列表中选中多个 Markdown 文件。
2. 右键选择 "🧩 批量拆解"。
3. 看着它们被一个个转化为原子卡片。

## ⚙️ 配置选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| LLM Provider | AI 服务提供商 | Claude / OpenAI / Local |
| API Key | API 密钥（本地加密存储） | - |
| Local Server URL | 本地模型地址 | http://localhost:11434 |
| 拆解粒度 | 控制生成卡片的数量 | 中等（5-8张） |
| 默认保存文件夹 | 卡片保存位置 | 原笔记同级目录 |
| 保留原笔记 | 拆解后是否保留原文件 | 是 |

## 🎯 卡片格式

每张卡片包含：

```yaml
---
description: 50字内中文简述核心
tags: 认知观念 # 或 方法工具、行动指南、资源列表、案例实战
---

- **内容**：重写后的原子化内容（清晰、独立、可复用）
- **说明**：笔记类型和上下文来源
- **关联**：[[相关概念1]] | [[相关概念2]]
- **位置**：[向上追溯] [[MOC]]；[向下拆解] [[案例]]
```

## 🛣️ 开发路线图

### V1.0（已发布）
- [x] OpenAI 支持（备用 Provider）
- [x] 批量拆解多篇笔记
- [x] 撤销功能

### V2.0（已发布）
- [x] 交互式编辑 (Interactive Editing)
- [x] 向下合并 (Merge Logic)
- [x] 自定义 Prompt 模板 (Custom Templates)

### V3.0（已发布）
- [x] **本地智能 (Local Intelligence)**: Ollama / LM Studio 支持
- [x] **智能标签 (Smart Context)**: 基于 Vault 推荐
- [x] **模板分享 (Share)**: 导入/导出配置

### V5.0（已发布）
- [x] **Invisible UI**: 输入框自动隐身，减少视觉干扰
- [x] **Document Metaphor**: 像写文档一样自然，而非填写表单
- [x] **Click-to-Edit**: 所见即所得，点击即修

### V6.0（已发布）
- [x] **Zero Hallucination Policy**: Strict JSON validation
- [x] **Performance**: Optimized Link Resolution (O(1) fast path)
- [x] **Type Safety**: 100% TypeScript coverage

### V7.0（已发布）
- [x] **Responsive Invisible UI**: Adapts to touch (faint borders, stacked layout)
- [x] **Touch-Ready**: Optimized hit targets and visibility

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

