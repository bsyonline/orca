# 拖放打开文件 — 设计文档

**日期：** 2026-06-11  
**状态：** 已批准

## 需求

用户可以将单个 `.md` 文件从 Finder（或其他文件管理器）拖入应用右侧编辑区，松开后自动打开该文件。拖拽过程中编辑区显示视觉高亮反馈，非 `.md` 文件拖入时不响应。

## 方案

使用 Renderer 层 HTML5 drag-and-drop API（方案 A）。改动仅限 renderer，无需修改 main 进程或 preload。

## 数据流

```
用户拖 .md 文件到编辑区
  → dragover  → 验证扩展名为 .md → 添加 CSS class "drag-over"（高亮）
  → dragleave → 移除 CSS class
  → drop      → 取 dataTransfer.files[0].path
              → window.api.readFile(path)
              → openFile(path, content)
```

## 改动文件

### `src/renderer/src/App.tsx`

- 在 `<main className="editor-area">` 上添加三个事件处理器
- 用 `useState<boolean>` 跟踪拖拽悬停状态，控制 `drag-over` CSS class
- `onDragOver`：调用 `e.preventDefault()` + `e.stopPropagation()`；检查 `e.dataTransfer.items[0]` 的文件名后缀是否为 `.md`，是则设置 `dragOver = true`
- `onDragLeave`：检查 `e.relatedTarget` 是否仍在 `.editor-area` 内，若已离开则设置 `dragOver = false`（防止鼠标经过子元素时闪烁）
- `onDrop`：取 `e.dataTransfer.files[0]`，验证路径以 `.md` 结尾后调用现有 `handleFileSelect(path)`；最后重置 `dragOver = false`

### `src/renderer/src/App.css`

为 `.editor-area.drag-over` 叠加遮罩层（伪元素 `::after`），包含：
- 半透明背景覆盖整个编辑区
- 明显边框（dashed 或 solid，与主题色一致）
- 居中文字提示"松开以打开文件"

## 错误处理

- 非 `.md` 文件：`dragover` 不设置高亮，`drop` 时直接忽略
- `readFile` 失败：复用现有 store 错误处理路径，无需额外处理

## 不在范围内

- 拖入文件夹（目录）
- 拖入多个文件
- 侧边栏区域的拖放响应
- macOS Dock 图标拖入（`app.on('open-file')`）
