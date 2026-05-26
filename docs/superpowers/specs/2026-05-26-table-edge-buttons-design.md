# 表格边缘按钮功能设计

## 背景

当前编辑器已有表格功能，但调整行列数量的操作只能通过菜单栏执行，不够直观。用户希望在表格上直接显示操作按钮，方便快捷地调整表格结构。

## 需求

- **显示条件**：鼠标悬停在表格上时显示操作按钮
- **添加行**：每行末尾显示 + 按钮，点击在该行下方插入新行
- **添加列**：每列末尾显示 + 按钮，点击在该列右侧插入新列
- **删除单元格**：选中超过1个单元格时显示删除按钮，点击删除选中的所有单元格

## 实现方案

使用 MutationObserver + DOM 操作方案。

### 技术选型理由

1. **简单可靠**：不需要深入理解 ProseMirror 内部机制
2. **低风险**：不修改编辑器核心逻辑，只是在外层添加 UI 交互
3. **易于维护**：逻辑清晰，代码独立，方便后续调试和修改
4. **复用现有命令**：直接调用已有的 Milkdown 命令（addRowAfterCommand、addColAfterCommand、deleteSelectedCellsCommand）

### 实现步骤

#### 1. 创建 TableEdgeButtons 组件

新建 `src/renderer/src/components/Editor/TableEdgeButtons.tsx` 和对应的 CSS 文件。

**功能：**
- 监听编辑器 DOM 变化（使用 MutationObserver）
- 当表格被添加到 DOM 时，为每个表格添加边缘按钮
- 管理 hover 状态（CSS 控制）
- 检测选中状态（通过 ProseMirror 的 selection API）
- 处理按钮点击事件

**核心逻辑：**
```typescript
// 监听表格出现
useEffect(() => {
  const observer = new MutationObserver((mutations) => {
    // 检查是否有新的表格元素
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            const tables = node.querySelectorAll('table')
            tables.forEach(attachButtonsToTable)
          }
        })
      }
    }
  })
  observer.observe(editorRef.current, { childList: true, subtree: true })
  return () => observer.disconnect()
}, [])

// 为表格添加按钮
function attachButtonsToTable(table: HTMLElement) {
  // 添加容器包裹表格
  const wrapper = document.createElement('div')
  wrapper.className = 'table-wrapper'
  table.parentNode?.insertBefore(wrapper, table)
  wrapper.appendChild(table)
  
  // 添加行尾 + 按钮
  const rows = table.querySelectorAll('tr')
  rows.forEach((row, index) => {
    const addButton = createAddRowButton(index)
    wrapper.appendChild(addButton)
  })
  
  // 添加列尾 + 按钮
  // ...
}
```

#### 2. 添加 CSS 样式

在 `TableEdgeButtons.css` 中定义：
- 表格 wrapper 的布局（使用 CSS Grid 或 absolute positioning）
- + 按钮的样式（圆形、半透明、hover 高亮）
- 删除按钮的样式
- hover 显示/隐藏的逻辑

#### 3. 检测选中状态

通过 ProseMirror 的 selection API 判断是否选中了超过1个单元格：
- 获取当前 selection 的 from 和 to
- 检查选区是否跨越多个单元格
- 如果跨越多个单元格，显示删除按钮

#### 4. 处理点击事件

调用 Milkdown 的命令：
- 添加行：`callCommand(addRowAfterCommand.key)`
- 添加列：`callCommand(addColAfterCommand.key)`
- 删除单元格：`callCommand(deleteSelectedCellsCommand.key)`

需要确定当前光标位置，以便正确执行命令。

### 文件结构

```
src/renderer/src/components/Editor/
├── Editor.tsx          # 引入 TableEdgeButtons
├── Editor.css          # 保持现有样式
├── TableEdgeButtons.tsx # 新增：边缘按钮逻辑
├── TableEdgeButtons.css # 新增：边缘按钮样式
├── TableDialog.tsx     # 保持现有
└── TableDialog.css     # 保持现有
```

### UI 设计

**+ 按钮：**
- 圆形按钮，直径约 20px
- 背景：半透明灰色，hover 时高亮
- 位置：行尾在行的右侧，列尾在列的下方
- 对齐：与表格边缘对齐

**删除按钮：**
- 当选中超过1个单元格时显示
- 位置：在选区附近（例如选区右上角或工具栏）
- 样式：与 + 按钮类似，但颜色为红色警示色

### 边界情况

1. **表格嵌套**：Markdown 表格不支持嵌套，无需处理
2. **空表格**：即使是空表格也显示按钮
3. **表格删除**：表格被删除时，按钮也应随之移除（MutationObserver 自动处理）
4. **多表格文档**：每个表格独立管理自己的按钮
5. **撤销/重做**：操作后表格结构变化，MutationObserver 会自动更新按钮位置

### 测试要点

1. 悬停显示/隐藏是否正常
2. 点击 + 按钮是否正确插入行/列
3. 选中多个单元格时删除按钮是否显示
4. 删除操作是否正常
5. 多表格文档中按钮是否独立工作
6. 表格结构变化后按钮是否正确更新

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| DOM 操作与编辑器状态不一致 | 使用 MutationObserver 实时监听，及时更新 |
| 按钮位置计算错误 | 使用 CSS absolute positioning 相对于表格 wrapper |
| 选中状态检测不准确 | 直接使用 ProseMirror 的 selection API |
| 性能问题（频繁 DOM 操作） | 只在表格出现/消失时操作，hover 状态由 CSS 处理 |

## 实现时间估计

- TableEdgeButtons.tsx + CSS：2-3小时
- 集成到 Editor.tsx：30分钟
- 测试与调试：1-2小时
- 总计：约4小时