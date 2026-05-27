# Table Edge Buttons — 完整行列调整功能设计

**日期**：2026-05-27  
**状态**：已批准

## 背景

现有 `TableEdgeButtons.tsx` 已有添加行/列的 `+` 按钮，但存在两个核心问题：
1. 添加行/列后按钮不更新（只在初始渲染时生成一次）
2. 缺少删除行/列的功能

## 目标

- 添加/删除行列后，按钮 overlay 自动更新
- 鼠标悬停某行时，该行左侧显示删除按钮
- 鼠标悬停某列时，该列顶部显示删除按钮

## 方案

**方案 A（已选）**：扩展现有 DOM overlay + MutationObserver

---

## 设计详情

### 1. 整体架构

**改动文件**：`src/renderer/src/components/Editor/TableEdgeButtons.tsx` 和 `TableEdgeButtons.css`

**两项核心修复**：

1. **结构变化后按钮更新**  
   给每个已包裹的 `<table>` 添加 `MutationObserver`（`childList: true, subtree: true`）。检测到行列增减时，调用 `updateButtons` 重建 overlay。Observer 回调使用 `setTimeout(fn, 50)` 防抖，避免与 milkdown DOM 操作产生冲突。

2. **删除功能**  
   在 `updateButtons` 中为每行生成左侧删除按钮，为每列生成顶部删除按钮。默认 `opacity: 0`，通过 JS `mouseenter`/`mouseleave` 绑定在对应 `<tr>` 或 `<th>/<td>` 上控制显隐。

**清理逻辑**：`wrapTable` 时保存该 table 对应的 `MutationObserver` 引用；组件 unmount 时在 `useEffect` cleanup 中断开所有 observer、移除所有 event listener。用 `Map<HTMLElement, MutationObserver>` 存储对应关系。

---

### 2. 按钮布局与定位

**行操作（每行两个按钮）**

| 按钮 | 位置 | 默认状态 | 触发 |
|------|------|----------|------|
| 右侧 `+` 添加行 | `right: -25px`，垂直居中于该行 | 随 overlay 整体 hover 显示 | 点击后在该行后插入新行 |
| 左侧 `−` 删除行 | `left: -25px`，垂直居中于该行 | `opacity: 0` | `<tr>` mouseenter 显示，mouseleave 隐藏 |

**列操作（每列两个按钮）**

| 按钮 | 位置 | 默认状态 | 触发 |
|------|------|----------|------|
| 底部 `+` 添加列 | `bottom: -25px`，水平居中于该列 | 随 overlay 整体 hover 显示 | 点击后在该列后插入新列 |
| 顶部 `−` 删除列 | `top: -25px`，水平居中于该列 | `opacity: 0` | 第一行对应 `<th>/<td>` mouseenter 显示，mouseleave 隐藏 |

**数据关联**：`updateButtons` 重建时，在 JS 闭包中记录行/列索引，点击时传入 `handleDeleteRow` / `handleDeleteCol`。

---

### 3. 删除逻辑

**`handleDeleteRow(table, rowIndex)`**
1. `setSelectionToCell(table, rowIndex, 0)` — 光标定位到目标行第一格
2. `callCommand(deleteSelectedCellsCommand.key)` — 删除整行

**`handleDeleteCol(table, colIndex)`**
1. `setSelectionToCell(table, 0, colIndex)` — 光标定位到目标列第一格
2. `callCommand(deleteSelectedCellsCommand.key)` — 删除整列

milkdown 的 `deleteSelectedCellsCommand` 在光标位于单元格时删除整行或整列，与菜单操作一致。

**边界保护**

- 表格只剩 1 行时：所有行删除按钮 `pointer-events: none` + 视觉变暗
- 表格只剩 1 列时：所有列删除按钮同上
- 在 `updateButtons` 时根据 `rows.length` 和 `firstRowCells.length` 判断并设置

---

## 不在范围内

- 拖拽调整行高/列宽
- 合并/拆分单元格
- 表格整体删除按钮（已有 CSS 存根，暂不实现）
