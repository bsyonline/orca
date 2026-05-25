# 表格插入对话框实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为表格插入功能添加自定义行列数的对话框

**Architecture:** React 模态框组件 + 状态管理，通过 props 回调与 Editor 组件通信

**Tech Stack:** React, TypeScript, CSS

---

## 文件结构

```
src/renderer/src/components/Editor/
├── Editor.tsx          (修改：添加对话框逻辑)
├── Editor.css          (不修改)
├── TableDialog.tsx     (新增：对话框组件)
└── TableDialog.css     (新增：对话框样式)
```

---

### Task 1: 创建 TableDialog 组件

**Files:**
- Create: `src/renderer/src/components/Editor/TableDialog.tsx`

- [ ] **Step 1: 创建 TableDialog.tsx 文件**

```typescript
import './TableDialog.css'
import { useState, useEffect, useRef } from 'react'

interface TableDialogProps {
  onConfirm: (rows: number, cols: number) => void
  onCancel: () => void
  defaultRows?: number
  defaultCols?: number
}

export function TableDialog({
  onConfirm,
  onCancel,
  defaultRows = 3,
  defaultCols = 3,
}: TableDialogProps) {
  const [rows, setRows] = useState(defaultRows)
  const [cols, setCols] = useState(defaultCols)
  const [error, setError] = useState<string | null>(null)
  const rowsInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    rowsInputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    if (rows < 1 || rows > 10) {
      setError('行数必须在 1-10 之间')
      return
    }
    if (cols < 1 || cols > 10) {
      setError('列数必须在 1-10 之间')
      return
    }
    setError(null)
    onConfirm(rows, cols)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="table-dialog-overlay" onClick={onCancel}>
      <div className="table-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <h3>插入表格</h3>
        <div className="table-dialog-inputs">
          <label>
            行数：
            <input
              ref={rowsInputRef}
              type="number"
              min={1}
              max={10}
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value) || 1)}
            />
          </label>
          <label>
            列数：
            <input
              type="number"
              min={1}
              max={10}
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value) || 1)}
            />
          </label>
        </div>
        {error && <div className="table-dialog-error">{error}</div>}
        <div className="table-dialog-buttons">
          <button className="table-dialog-cancel" onClick={onCancel}>
            取消
          </button>
          <button className="table-dialog-confirm" onClick={handleSubmit}>
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 提交 TableDialog.tsx**

```bash
git add src/renderer/src/components/Editor/TableDialog.tsx
git commit -m "feat: add TableDialog component"
```

---

### Task 2: 创建 TableDialog 样式

**Files:**
- Create: `src/renderer/src/components/Editor/TableDialog.css`

- [ ] **Step 1: 创建 TableDialog.css 文件**

```css
.table-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.table-dialog {
  background: var(--bg);
  border-radius: 12px;
  padding: 24px 28px;
  min-width: 280px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border-sub);
}

.table-dialog h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
}

.table-dialog-inputs {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.table-dialog-inputs label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--ink-2);
}

.table-dialog-inputs input {
  width: 60px;
  padding: 6px 10px;
  border: 1px solid var(--border-sub);
  border-radius: 6px;
  font-size: 14px;
  color: var(--ink);
  background: var(--bg-subtle);
}

.table-dialog-inputs input:focus {
  outline: none;
  border-color: var(--accent);
}

.table-dialog-error {
  color: #d32f2f;
  font-size: 13px;
  margin-bottom: 16px;
}

.table-dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.table-dialog-cancel {
  padding: 8px 16px;
  border: 1px solid var(--border-sub);
  border-radius: 6px;
  background: transparent;
  color: var(--ink-2);
  font-size: 14px;
  cursor: pointer;
}

.table-dialog-cancel:hover {
  background: var(--bg-subtle);
}

.table-dialog-confirm {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: var(--accent);
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.table-dialog-confirm:hover {
  opacity: 0.9;
}
```

- [ ] **Step 2: 提交 TableDialog.css**

```bash
git add src/renderer/src/components/Editor/TableDialog.css
git commit -m "feat: add TableDialog styles"
```

---

### Task 3: 修改 Editor.tsx 集成对话框

**Files:**
- Modify: `src/renderer/src/components/Editor/Editor.tsx:1-200`

- [ ] **Step 1: 在 Editor.tsx 添加 import 和 state**

在文件顶部添加 import：

```typescript
import './Editor.css'
import { useEffect, useCallback, useRef, useState } from 'react'
import { Editor as MilkdownCoreEditor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/kit/core'
import {
  commonmark,
  toggleStrongCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  wrapInHeadingCommand,
  turnIntoTextCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  wrapInBlockquoteCommand,
  createCodeBlockCommand,
  insertHrCommand,
  sinkListItemCommand,
  liftListItemCommand,
} from '@milkdown/kit/preset/commonmark'
import {
  gfm,
  insertTableCommand,
  addRowAfterCommand,
  addColAfterCommand,
  deleteSelectedCellsCommand,
  toggleStrikethroughCommand,
} from '@milkdown/kit/preset/gfm'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { history } from '@milkdown/kit/plugin/history'
import { Milkdown, useEditor, useInstance } from '@milkdown/react'
import { getMarkdown, callCommand, insert, replaceAll } from '@milkdown/kit/utils'
import { TextSelection } from '@milkdown/kit/prose/state'
import { useAppStore } from '../../store/useAppStore'
import { handleImagePaste, handleImageDrop } from '../../lib/imageHandler'
import { buildHTMLDocument } from '../../lib/exporters/html'
import { markdownToDocxBuffer } from '../../lib/exporters/word'
import { basename } from '../../lib/pathUtils'
import { transformImagePath, restoreImagePath } from '../../lib/transformImagePath'
import { TableDialog } from './TableDialog'

import '@milkdown/prose/view/style/prosemirror.css'
```

在 `Editor` 函数内添加 state（约 line 50 附近，在其他 state 定义之后）：

```typescript
export function Editor({ filePath, initialContent }: EditorProps) {
  const { setIsDirty } = useAppStore()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sourceMode, setSourceMode] = useState(false)
  const [sourceContent, setSourceContent] = useState('')
  const [typingMode, setTypingMode] = useState(false)
  const [showTableDialog, setShowTableDialog] = useState(false)
  const transformedContent = transformImagePath(initialContent, filePath)
  const sourceMdRef = useRef(initialContent)
```

- [ ] **Step 2: 修改 table 处理逻辑**

找到 line 138 的 `case 'table'` 分支，修改为：

```typescript
case 'table': setShowTableDialog(true); break
```

- [ ] **Step 3: 添加 handleTableConfirm 函数**

在 `useEffect` 的 cleanupParagraph 内部（约 line 191 之后），添加：

```typescript
const handleTableConfirm = useCallback(
  (rows: number, cols: number) => {
    const instance = getInstance()
    if (instance) {
      instance.action(callCommand(insertTableCommand.key, { row: rows, col: cols } as never))
    }
    setShowTableDialog(false)
  },
  [getInstance],
)
```

- [ ] **Step 4: 在 JSX 中渲染 TableDialog**

找到组件的 return 部分（约 line 350 附近），在 `.editor-wrapper` 内最后添加：

```typescript
return (
  <div className="editor-wrapper">
    {sourceMode ? (
      <textarea
        className="source-view"
        value={sourceContent}
        onChange={(e) => setSourceContent(e.target.value)}
        onBlur={handleSourceBlur}
      />
    ) : (
      <>
        <Milkdown />
        {showTableDialog && (
          <TableDialog
            onConfirm={handleTableConfirm}
            onCancel={() => setShowTableDialog(false)}
            defaultRows={3}
            defaultCols={3}
          />
        )}
      </>
    )}
  </div>
)
```

- [ ] **Step 5: 提交 Editor.tsx 修改**

```bash
git add src/renderer/src/components/Editor/Editor.tsx
git commit -m "feat: integrate TableDialog into Editor"
```

---

### Task 4: 测试功能

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 验证对话框显示**

操作：
1. 打开应用
2. 点击菜单 "插入表格"（CmdOrCtrl+Shift+T）
3. 应看到对话框，默认显示 3×3

- [ ] **Step 3: 验证正常插入**

操作：
1. 输入行数 5，列数 4
2. 点击确定
3. 应插入 5 行 × 4 列的表格

- [ ] **Step 4: 验证非法输入**

操作：
1. 输入行数 0 或 11
2. 点击确定
3. 应显示红色错误提示，不插入表格

- [ ] **Step 5: 验证取消操作**

操作：
1. 打开对话框
2. 点击取消或按 Escape
3. 对话框关闭，不插入表格

- [ ] **Step 6: 验证快捷键**

操作：
1. 打开对话框
2. 按 Enter
3. 应确认插入

---

## 验收标准

1. 点击"插入表格"显示对话框
2. 默认显示 3×3
3. 输入有效值（1-10）并确定，正确插入对应表格
4. 输入无效值显示错误提示，不插入
5. 点击取消或按 Escape 关闭对话框
6. 按 Enter 快速确定