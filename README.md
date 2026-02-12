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

## ⚙️ 配置选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| LLM Provider | AI 服务提供商 | Claude |
| API Key | API 密钥（本地加密存储） | - |
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

## 💡 开发指南

### 构建生产版本

```bash
npm run build
```

### 类型检查

```bash
npx tsc --noEmit
```

### 调试技巧

1. 打开 Obsidian 开发者工具（Ctrl/Cmd + Shift + I）
2. 查看 Console 中的日志输出
3. 在代码中使用 `console.log()` 调试

## 📝 技术栈

- **TypeScript** - 类型安全的代码
- **Obsidian API** - 插件开发框架
- **Anthropic Claude SDK** - AI 拆解能力
- **esbuild** - 快速构建工具

## 🛣️ 开发路线图

### MVP（已完成）
- [x] 基础拆解流程
- [x] 预览界面
- [x] 文件生成
- [x] 设置页面

### V1.0（计划中）
- [ ] OpenAI 支持（备用 Provider）
- [ ] 批量拆解多篇笔记
- [ ] 撤销功能
- [ ] 拆解历史记录

### V2.0（未来）
- [ ] 卡片编辑和合并
- [ ] 自定义 Prompt 模板
- [ ] 导出/分享拆解方案

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 💬 联系方式

- GitHub Issues: [报告问题](https://github.com/yourusername/obsidian-atomic-notes/issues)
- 讨论区: [参与讨论](https://github.com/yourusername/obsidian-atomic-notes/discussions)

---

**Built with ❤️ by AI Team** (product-norman, cto-vogels, interaction-cooper, fullstack-dhh)
