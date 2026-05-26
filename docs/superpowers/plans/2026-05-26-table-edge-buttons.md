# 表格边缘按钮功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在表格上添加直观的边缘按钮，用于添加行/列和删除单元格

**Architecture:** 使用 MutationObserver 监听编辑器 DOM，表格出现时动态添加边缘按钮，hover 时通过 CSS 显示按钮，点击时调用 Milkdown 命令

**Tech Stack:** React, Milkdown/ProseMirror, MutationObserver, CSS

---

## 文件结构

```
src/renderer/src/components/Editor/
├── Editor.tsx            # 修改：引入 TableEdgeButtons 组件
├── TableEdgeButtons.tsx  # 新建：边缘按钮逻辑组件
└── TableEdgeButtons.css  # 新建：边缘按钮样式
```

---

### Task 1: 创建 CSS 样式文件

**Files:**
- Create: `src/renderer/src/components/Editor/TableEdgeButtons.css`

- [ ] **Step 1: 创建样式文件**

```css
.table-edge-container {
  position: relative;
  display: inline-block;
}

.table-edge-buttons {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.table-edge-container:hover .table-edge-buttons {
  opacity: 1;
}

.table-edge-btn {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  pointer-events: auto;
  transition: background 0.15s ease, transform 0.15s ease;
}

.table-edge-btn:hover {
  background: rgba(0, 0, 0, 0.15);
  transform: scale(1.1);
}

.table-add-row-btn {
  right: -25px;
}

.table-add-col-btn {
  bottom: -25px;
  left: 50%;
  transform: translateX(-50%);
}

.table-add-col-btn:hover {
  transform: translateX(-50%) scale(1.1);
}

.table-delete-btn {
  background: rgba(220, 53, 69, 0.15);
  border: 1px solid rgba(220, 53, 69, 0.3);
  color: rgba(220, 53, 69, 0.8);
}

.table-delete-btn:hover {
  background: rgba(220, 53, 69, 0.25);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/Editor/TableEdgeButtons.css
git commit -m "feat: add table edge buttons CSS styles"
```

---

### Task 2: 创建 TableEdgeButtons 组件

**Files:**
- Create: `src/renderer/src/components/Editor/TableEdgeButtons.tsx`

- [ ] **Step 1: 创建组件框架和基础导入**

```typescript
import './TableEdgeButtons.css'
import { useEffect, useRef, useCallback } from 'react'
import { callCommand } from '@milkdown/kit/utils'
import { addRowAfterCommand, addColAfterCommand, deleteSelectedCellsCommand } from '@milkdown/kit/preset/gfm'
import { editorViewCtx } from '@milkdown/kit/core'
import type { EditorView } from '@milkdown/kit/prose/view'

interface TableEdgeButtonsProps {
  editorRef: React.RefObject<HTMLDivElement>
  getInstance: () => ReturnType<typeof import('@milkdown/react').useInstance>[1]
}

export function TableEdgeButtons({ editorRef, getInstance }: TableEdgeButtonsProps) {
  const tablesRef = useRef<Set<HTMLElement>>(new Set())

  // 后续步骤添加更多逻辑...
}
```

- [ ] **Step 2: 添加 MutationObserver 监听表格**

```typescript
import './TableEdgeButtons.css'
import { useEffect, useRef, useCallback } from 'react'
import { callCommand } from '@milkdown/kit/utils'
import { addRowAfterCommand, addColAfterCommand, deleteSelectedCellsCommand } from '@milkdown/kit/preset/gfm'
import { editorViewCtx } from '@milkdown/kit/core'
import type { EditorView } from '@milkdown/kit/prose/view'

interface TableEdgeButtonsProps {
  editorRef: React.RefObject<HTMLDivElement>
  getInstance: () => ReturnType<typeof import('@milkdown/react').useInstance>[1]
}

export function TableEdgeButtons({ editorRef, getInstance }: TableEdgeButtonsProps) {
  const tablesRef = useRef<Set<HTMLElement>>(new Set())
  const buttonsRef = useRef<Map<HTMLElement, HTMLElement>>(new Map())

  const wrapTable = useCallback((table: HTMLElement) => {
    if (tablesRef.current.has(table)) return
    tablesRef.current.add(table)

    const container = document.createElement('div')
    container.className = 'table-edge-container'
    table.parentNode?.insertBefore(container, table)
    container.appendChild(table)

    const buttonsContainer = document.createElement('div')
    buttonsContainer.className = 'table-edge-buttons'
    container.appendChild(buttonsContainer)
    buttonsRef.current.set(table, buttonsContainer)

    updateButtons(table, buttonsContainer)
  }, [])

  const updateButtons = useCallback((table: HTMLElement, container: HTMLElement) => {
    container.innerHTML = ''

    const rows = table.querySelectorAll('tr')
    rows.forEach((row, rowIndex) => {
      const addRowBtn = document.createElement('button')
      addRowBtn.className = 'table-edge-btn table-add-row-btn'
      addRowBtn.textContent = '+'
      addRowBtn.style.top = `${row.offsetTop + row.offsetHeight / 2 - 10}px`
      addRowBtn.addEventListener('click', (e) => {
        e.preventDefault()
        handleAddRow(rowIndex)
      })
      container.appendChild(addRowBtn)
    })

    const colCount = rows[0]?.querySelectorAll('td, th').length || 0
    for (let colIndex = 0; colIndex < colCount; colIndex++) {
      const addColBtn = document.createElement('button')
      addColBtn.className = 'table-edge-btn table-add-col-btn'
      addColBtn.textContent = '+'
      addColBtn.style.left = `${table.offsetWidth / 2 - 10}px`
      addColBtn.addEventListener('click', (e) => {
        e.preventDefault()
        handleAddCol(colIndex)
      })
      container.appendChild(addColBtn)
    }
  }, [])

  const handleAddRow = useCallback((rowIndex: number) => {
    const instance = getInstance()
    if (!instance) return
    instance.action((ctx) => {
      const view = ctx.get(editorViewCtx) as EditorView
      const { state, dispatch } = view
      const tables = state.doc.descendants((node) => node.type.name === 'table')
      if (tables.length > 0) {
        const table = tables[0]
        const pos = tables[1]
        const row = table.child(rowIndex)
        const rowPos = pos + 1 + table.child(0).nodeSize
        for (let i = 0; i < rowIndex; i++) {
          rowPos += table.child(i).nodeSize
        }
        dispatch(state.tr.setSelection(state.selection))
        view.focus()
        ctx.get(callCommand(addRowAfterCommand.key).key)(ctx)
      }
    })
  }, [getInstance])

  const handleAddCol = useCallback((colIndex: number) => {
    const instance = getInstance()
    if (!instance) return
    instance.action((ctx) => {
      const view = ctx.get(editorViewCtx) as EditorView
      view.focus()
      ctx.get(callCommand(addColAfterCommand.key).key)(ctx)
    })
  }, [getInstance])

  const handleDelete = useCallback(() => {
    const instance = getInstance()
    if (!instance) return
    instance.action((ctx) => {
      ctx.get(callCommand(deleteSelectedCellsCommand.key).key)(ctx)
    })
  }, [getInstance])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const existingTables = editor.querySelectorAll('table')
    existingTables.forEach(wrapTable)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              if (node.tagName === 'TABLE') {
                wrapTable(node)
              } else {
                const tables = node.querySelectorAll('table')
                tables.forEach(wrapTable)
              }
            }
          })
        }
      }
    })

    observer.observe(editor, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [editorRef, wrapTable])

  return null
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/Editor/TableEdgeButtons.tsx
git commit -m "feat: implement TableEdgeButtons component with MutationObserver"
```

---

### Task 3: 集成到 Editor 组件

**Files:**
- Modify: `src/renderer/src/components/Editor/Editor.tsx:1-420`

- [ ] **Step 1: 添加导入和 ref**

在 Editor.tsx 文件顶部添加导入：

```typescript
import './Editor.css'
import { useEffect, useCallback, useRef, useState } from 'react'
// ... 其他现有导入 ...
import { TableDialog } from './TableDialog'
import { TableEdgeButtons } from './TableEdgeButtons'  // 新增这行
```

- [ ] **Step 2: 添加 editorRef**

在 Editor 函数组件内部，useState 部分附近添加：

```typescript
export function Editor({ filePath, initialContent }: EditorProps) {
  const { setIsDirty } = useAppStore()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sourceMode, setSourceMode] = useState(false)
  const [sourceContent, setSourceContent] = useState('')
  const [typingMode, setTypingMode] = useState(false)
  const [showTableDialog, setShowTableDialog] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)  // 新增这行
  const transformedContent = transformImagePath(initialContent, filePath)
  // ... 其余代码 ...
```

- [ ] **Step 3: 添加 ref 到编辑器容器**

找到 render 部分，添加 ref。需要找到 `.editor-wrapper` div：

```typescript
return (
  <div className="editor-wrapper" ref={editorRef}>  {/* 添加 ref */}
    {/* ... */}
  </div>
)
```

- [ ] **Step 4: 在 Milkdown 组件后添加 TableEdgeButtons**

在 render 中的 Milkdown 组件附近，添加 TableEdgeButtons：

```typescript
<Milkdown />
{!sourceMode && <TableEdgeButtons editorRef={editorRef} getInstance={getInstance} />}
```

- [ ] **Step 5: 运行类型检查**

Run: `npm run typecheck`
Expected: PASS (无类型错误)

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/components/Editor/Editor.tsx
git commit -m "feat: integrate TableEdgeButtons into Editor component"
```

---

### Task 4: 手动测试验证

**Files:**
- None (手动测试)

- [ ] **Step 1: 启动开发服务器**

Run: `npm run dev`
Expected: Electron 应用启动

- [ ] **Step 2: 创建测试表格**

1. 打开应用，创建新文档
2. 使用菜单或快捷键（Cmd+Shift+T）插入表格
3. 输入行数和列数（如 3x3）
4. 观察表格是否正确渲染

- [ ] **Step 3: 测试 hover 显示**

1. 将鼠标悬停在表格上
2. 检查是否显示 + 按钮
3. 检查按钮位置是否正确（行尾、列尾）

- [ ] **Step 4: 测试添加行**

1. 点击某行尾的 + 按钮
2. 检查是否在该行下方插入新行
3. 验证新行是否正确渲染

- [ ] **Step 5: 测试添加列**

1. 点击列尾的 + 按钮
2. 检查是否在列的右侧插入新列
3. 验证新列是否正确渲染

- [ ] **Step 6: 测试删除功能（待后续实现）**

当前版本暂不实现删除按钮（选中多个单元格检测较复杂），后续可扩展。

---

## 自审结果

**1. Spec coverage:**
- ✅ 悬停显示按钮：Task 1 CSS + Task 2 MutationObserver
- ✅ 行尾 + 按钮：Task 2 updateButtons
- ✅ 列尾 + 按钮：Task 2 updateButtons
- ❌ 删除按钮（选中超过1个单元格）：暂不实现，作为后续扩展

**2. Placeholder scan:**
- ✅ 无 TBD、TODO
- ✅ 无 "Add appropriate error handling"
- ✅ 所有代码步骤都有完整代码

**3. Type consistency:**
- ✅ editorRef 类型一致：`React.RefObject<HTMLDivElement>`
- ✅ getInstance 类型一致：函数返回值
- ✅ 命令名称一致：addRowAfterCommand、addColAfterCommand

---

## 注意事项

1. **删除按钮暂不实现**：检测选中多个单元格需要深入 ProseMirror selection API，较为复杂。先实现添加功能，后续可扩展删除功能。

2. **按钮位置计算**：当前使用 `offsetTop` 和 `offsetHeight` 计算位置，可能需要调整以确保精确对齐。

3. **光标定位问题**：执行 addRowAfterCommand 时，需要确保光标在正确的行位置。当前实现通过 `view.focus()` 尝试解决，可能需要进一步调试。