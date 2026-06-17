# Markdown 编辑器桌面 App 设计文档

**日期**：2026-05-18
**状态**：已确认，待实现

---

## 概述

一个 Typora 平替的桌面 Markdown 编辑器，定位为个人自用工具，后续考虑开源。核心体验：所见即所得（WYSIWYG）、简洁无干扰、对开发者友好（代码块必须好用）。

---

## 目标与非目标

**MVP 目标：**
- WYSIWYG Markdown 编辑（边写边渲染，无分屏）
- 代码块语法高亮
- 左侧固定文件树（打开本地文件夹）
- LaTeX 数学公式渲染（KaTeX）
- 导出：PDF、HTML、Word
- 图片拖拽/粘贴支持

**MVP 不做：**
- 主题切换/自定义 CSS（MVP 后考虑）
- 专注模式/打字机模式
- 云同步
- 插件系统

---

## 技术栈

| 层级 | 选型 | 理由 |
|------|------|------|
| 桌面框架 | Electron | 成熟生态，AI 工具支持好，跨平台扩展方便 |
| 前端框架 | React + TypeScript | AI 工具支持最佳，类型安全 |
| 编辑器引擎 | Milkdown | 专为 WYSIWYG Markdown 设计，基于 ProseMirror，开箱即得 Typora 体验 |
| 状态管理 | Zustand | 轻量，API 简单，AI 工具友好 |
| 数学公式 | KaTeX（Milkdown 插件） | 渲染快，Milkdown 原生支持 |
| Word 导出 | docx（npm） | 纯 JS，无系统依赖 |
| 打包 | electron-builder | macOS .dmg 打包 |

**初始平台**：macOS（优先），后续扩展 Windows/Linux。

---

## UI 设计决策

| 决策项 | 选择 | 说明 |
|--------|------|------|
| 整体布局 | 固定侧边栏 | 文件树常驻左侧，始终可见，方便多文件切换 |
| 工具栏 | 无工具栏 | Typora 风格，格式化全靠快捷键和 Markdown 语法 |
| 主题 | 明亮模式 | 白底黑字，接近纸张质感，MVP 只做亮色 |

---

## 架构

### 进程模型

```
Main Process (Node.js)
├── 文件系统操作（读/写/目录监听）
├── 原生菜单（File / Edit / View）
├── 导出（PDF: printToPDF，Word: docx，HTML: 序列化+CSS）
└── IPC 桥接（preload.ts）

Renderer Process (React)
├── FileTree     — 左侧文件树
├── Editor       — Milkdown WYSIWYG 编辑器
└── StatusBar    — 底部状态栏（字数、光标位置）
```

### IPC 边界

所有文件系统操作通过 IPC 由主进程执行，渲染进程不直接访问 Node.js API（遵循 Electron 安全最佳实践，`contextIsolation: true`）。

### 文件处理流程

1. 用户打开文件夹 → 主进程读取目录树 → 渲染文件树
2. 点击文件 → IPC 读取内容 → 加载到 Editor
3. 自动保存：失焦时 + 每 30 秒 → IPC 写回磁盘
4. 文件变更监听（chokidar）→ 外部修改时提示重新加载

---

## 项目结构

```
orca/
├── electron/
│   ├── main.ts                    # 主进程入口
│   ├── preload.ts                 # IPC 安全桥接
│   └── handlers/
│       ├── file.ts                # 文件读写、目录监听
│       └── export.ts              # PDF / HTML / Word 导出
├── src/
│   ├── App.tsx                    # 根组件，布局骨架
│   ├── store/
│   │   └── useAppStore.ts         # Zustand 全局状态
│   ├── components/
│   │   ├── FileTree/              # 左侧文件树组件
│   │   ├── Editor/                # Milkdown 编辑器封装
│   │   └── StatusBar/             # 底部状态栏
│   └── lib/
│       ├── exporters/             # html.ts / pdf.ts / word.ts
│       └── imageHandler.ts        # 图片粘贴/拖拽处理
├── package.json
└── electron-builder.config.ts    # macOS 打包配置
```

---

## 核心数据模型

```ts
interface AppState {
  workspaceRoot: string | null   // 当前打开的文件夹路径
  activeFile: string | null      // 当前编辑的文件绝对路径
  fileTree: FileNode[]           // 文件树数据
  isDirty: boolean               // 是否有未保存的修改
}

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}
```

---

## 功能细节

### 图片处理
- 粘贴或拖拽图片 → 复制到 `./assets/` 目录（相对当前 .md 文件）
- 插入 `![](./assets/<filename>)`
- 失败时降级为 base64 内联

### 代码块
- Milkdown 代码块插件 + highlight.js 语法高亮
- 支持语言标注（```python 等）

### 数学公式
- Milkdown KaTeX 插件
- 行内公式：`$...$`，块级公式：`$$...$$`

### 导出
- **PDF**：`webContents.printToPDF()` + 注入打印 CSS
- **HTML**：Milkdown 序列化 → 独立 HTML 文件（内联 CSS）
- **Word**：`docx` 库将 Markdown AST 转为 .docx

---

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 文件读写失败 | 顶部 toast 提示，不中断编辑 |
| 导出失败 | 弹窗提示具体错误原因 |
| 图片保存失败 | 降级为 base64 内联 |
| 外部文件被删除 | 提示用户，保留编辑内容供另存为 |

---

## 后续规划（MVP 之后）

- 主题切换（亮/暗/自定义 CSS）
- 专注模式 / 打字机模式
- Windows / Linux 支持
- 开源发布
