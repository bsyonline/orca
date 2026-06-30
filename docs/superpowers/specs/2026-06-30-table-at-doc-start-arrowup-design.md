# Table at Document Start - ArrowUp Behavior Design

## Summary

当表格插入到文档第一行时，用户无法在表格前插入文字。本设计实现：当光标在表格的第一行第一列且表格位于文档开头时，按下上箭头键将在表格前插入一个空段落，将表格下移。

## Requirements

- **触发条件**: 光标位于表格的第一行第一列，且表格是文档的第一个节点
- **动作**: 按下 ArrowUp 键时，在表格前插入一个空的 paragraph 节点
- **光标位置**: 插入后光标移动到新段落开头
- **降级行为**: 如果条件不满足，ArrowUp 保持默认行为（向上移动光标）

## Architecture

在 `Editor.tsx` 中添加自定义 ProseMirror keymap 插件。该插件拦截 ArrowUp 键事件，检测光标位置和表格位置，满足条件时插入空段落。

插件通过 Milkdown 的 `.use()` 方法链式组合，确保与其他键盘处理（如 history、GFM）协同工作。

## Components

### 1. 位置检测函数

检查三个条件：
- 光标所在节点是表格（通过 `$from.depth` 向上遍历找到 table 节点）
- 表格是文档第一个节点（表格位置 pos === 0 或接近 0）
- 光标在表格首行首列（通过遍历表格子节点计算单元格位置）

```typescript
function shouldInsertParagraphBeforeTable(state: EditorState): boolean {
  const { $from } = state.selection
  
  // 向上遍历找到 table 节点
  for (let d = $from.depth; d >= 0; d--) {
    const node = $from.node(d)
    if (node.type.name === 'table') {
      const tablePos = $from.before(d)
      
      // 检查表格是否是文档第一个节点
      if (tablePos !== 0) return false
      
      // 检查光标是否在首行首列
      // ... 详细的单元格位置计算逻辑
      return isAtFirstRowFirstCell($from, node, tablePos)
    }
  }
  
  return false
}
```

### 2. 插入空段落逻辑

满足条件时执行：

```typescript
function insertParagraphBeforeTable(state: EditorState, dispatch: Dispatch): boolean {
  const { $from } = state.selection
  
  for (let d = $from.depth; d >= 0; d--) {
    const node = $from.node(d)
    if (node.type.name === 'table') {
      const tablePos = $from.before(d)
      const paragraph = state.schema.nodes.paragraph.create()
      const tr = state.tr.insert(tablePos, paragraph)
      tr.setSelection(TextSelection.create(tr.doc, tablePos + 1))
      dispatch(tr)
      return true
    }
  }
  
  return false
}
```

### 3. keymap 配置

导入并注册 keymap 插件：

```typescript
import { keymap } from '@milkdown/kit/prose/keymap'

// 在 useEditor 中添加
.use(keymap({
  'ArrowUp': (state, dispatch) => {
    if (shouldInsertParagraphBeforeTable(state)) {
      return insertParagraphBeforeTable(state, dispatch)
    }
    return false // 让默认处理器接管
  }
}))
```

## Data Flow

```
用户按下 ArrowUp
  ↓
keymap 插件拦截事件
  ↓
调用 shouldInsertParagraphBeforeTable(state)
  ↓
条件满足？
  ├─ Yes → insertParagraphBeforeTable(state, dispatch)
  │         ↓
  │         创建 transaction 插入空段落
  │         ↓
  │         设置新选区（光标在新段落）
  │         ↓
  │         dispatch transaction
  │         ↓
  │         返回 true（阻止默认行为）
  │         ↓
  │         编辑器视图更新
  │
  └─ No → 返回 false
           ↓
           ProseMirror 默认 ArrowUp 处理
           ↓
           光标向上移动
```

## Error Handling

所有错误情况优雅降级，返回 false 让默认行为接管：

- 编辑器实例未准备好 → 返回 false
- 找不到 table 节点 → 返回 false
- nodeAt 返回 null → 返回 false
- 位置计算异常 → 返回 false

无用户可见的错误提示，静默降级保证编辑器功能不被破坏。

## Testing

使用 Vitest 和 Testing Library 测试以下场景：

### 正向测试

1. **场景**: 文档开头有一个表格，光标在首行首列
   - **操作**: 模拟 ArrowUp 键
   - **期望**: 表格前插入空段落，光标移至新段落开头

### 反向测试

2. **场景**: 光标在表格第二行第一列
   - **操作**: 模拟 ArrowUp 键
   - **期望**: 不插入段落，光标正常向上移动到第一行

3. **场景**: 表格前有文本（不在文档开头）
   - **操作**: 模拟 ArrowUp 键（光标在表格首行首列）
   - **期望**: 不插入段落，光标移动到表格前的文本

4. **场景**: 光标在表格第一行第二列
   - **操作**: 模拟 ArrowUp 键
   - **期望**: 不插入段落，光标停留在当前位置或正常向上

### 边界测试

5. **场景**: 文档只有一个表格（无其他内容）
   - **操作**: 模拟 ArrowUp 键
   - **期望**: 表格成为第二个节点，前面是空段落

## Implementation Notes

- keymap 插件应在 GFM 插件之后添加，确保优先级正确
- 使用 `$from.before(d)` 获取表格节点的精确位置
- 新段落位置计算：`tablePos + 1`（因为 paragraph 节点大小为 1）
- 无需修改现有 `insertAbove` 命令，这是独立的键盘行为增强

## Out of Scope

- 其他表格位置的 ArrowUp 特殊处理（如表格最后一行按下箭头）
- 表格内部的 Tab 键导航
- 表格选区的复制/粘贴行为

这些行为由 ProseMirror tables 包和 Milkdown GFM preset 处理，保持默认即可。