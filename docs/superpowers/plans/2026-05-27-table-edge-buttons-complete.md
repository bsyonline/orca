# Table Edge Buttons — 完整行列调整 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复表格 overlay 按钮在结构变化后不更新的问题，并新增悬停显示的删除行/列按钮。

**Architecture:** 扩展现有 `TableEdgeButtons.tsx` 的 DOM overlay 方案：每个已包裹的 table 增加 `MutationObserver` 监听结构变化，变化时重建 overlay；新增 `handleDeleteRow` / `handleDeleteCol`；用 `AbortController` 管理行/列的 hover 事件监听器生命周期，避免内存泄漏。

**Tech Stack:** React hooks, DOM MutationObserver, AbortController, milkdown `deleteSelectedCellsCommand`

---

## 文件变更

| 操作 | 文件 |
|------|------|
| Modify | `src/renderer/src/components/Editor/TableEdgeButtons.tsx` |
| Modify | `src/renderer/src/components/Editor/TableEdgeButtons.css` |

---

### Task 1: 更新 import，添加 refs

**Files:**
- Modify: `src/renderer/src/components/Editor/TableEdgeButtons.tsx:1-14`

- [ ] **Step 1: 在现有 import 行中添加 `deleteSelectedCellsCommand`**

将第 5 行的 gfm import 改为：

```typescript
import { addRowAfterCommand, addColAfterCommand, deleteSelectedCellsCommand } from '@milkdown/kit/preset/gfm'
```

- [ ] **Step 2: 在组件内部 `tablesRef` 和 `buttonsRef` 下方添加两个新 ref**

```typescript
const observersRef = useRef<Map<HTMLElement, MutationObserver>>(new Map())
const abortControllersRef = useRef<Map<HTMLElement, AbortController>>(new Map())
```

- [ ] **Step 3: 启动 dev server 确认无编译错误**

```bash
npm run dev
```

Expected: 编译成功，无 TypeScript 报错。

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/Editor/TableEdgeButtons.tsx
git commit -m "refactor: add observer and abort controller refs to TableEdgeButtons"
```

---

### Task 2: 添加 handleDeleteRow 和 handleDeleteCol

**Files:**
- Modify: `src/renderer/src/components/Editor/TableEdgeButtons.tsx`

- [ ] **Step 1: 在 `handleAddCol` 定义之后、`updateButtons` 定义之前插入以下两个 callback**

```typescript
const handleDeleteRow = useCallback((table: HTMLElement, rowIndex: number) => {
  if (!setSelectionToCell(table, rowIndex, 0)) return
  const instance = getInstance()
  if (!instance) return
  instance.action(callCommand(deleteSelectedCellsCommand.key))
}, [getInstance, setSelectionToCell])

const handleDeleteCol = useCallback((table: HTMLElement, colIndex: number) => {
  if (!setSelectionToCell(table, 0, colIndex)) return
  const instance = getInstance()
  if (!instance) return
  instance.action(callCommand(deleteSelectedCellsCommand.key))
}, [getInstance, setSelectionToCell])
```

- [ ] **Step 2: 确认编译通过**

```bash
npm run dev
```

Expected: 无报错。

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/Editor/TableEdgeButtons.tsx
git commit -m "feat: add handleDeleteRow and handleDeleteCol to TableEdgeButtons"
```

---

### Task 3: 重写 updateButtons — 添加删除按钮 + AbortController

**Files:**
- Modify: `src/renderer/src/components/Editor/TableEdgeButtons.tsx`

- [ ] **Step 1: 将 `updateButtons` 整体替换为以下实现**

```typescript
const updateButtons = useCallback((table: HTMLElement, container: HTMLElement) => {
  // 中止并替换上一轮的 hover 事件监听器
  abortControllersRef.current.get(table)?.abort()
  const ac = new AbortController()
  abortControllersRef.current.set(table, ac)
  const { signal } = ac

  container.innerHTML = ''

  const rows = table.querySelectorAll('tr')
  const rowCount = rows.length
  const firstRowCells = rows[0]?.querySelectorAll('td, th') || []
  const colCount = firstRowCells.length

  rows.forEach((row, rowIndex) => {
    const rowEl = row as HTMLElement

    // 右侧"+"添加行按钮（现有逻辑）
    const addRowBtn = document.createElement('button')
    addRowBtn.className = 'table-edge-btn table-add-row-btn'
    addRowBtn.textContent = '+'
    addRowBtn.style.top = `${rowEl.offsetTop + rowEl.offsetHeight / 2 - 10}px`
    addRowBtn.addEventListener('click', (e) => {
      e.preventDefault()
      handleAddRow(table, rowIndex)
    })
    container.appendChild(addRowBtn)

    // 左侧"−"删除行按钮（新增）
    const delRowBtn = document.createElement('button')
    delRowBtn.className = 'table-edge-btn table-delete-btn table-delete-row-btn'
    delRowBtn.textContent = '−'
    delRowBtn.style.top = `${rowEl.offsetTop + rowEl.offsetHeight / 2 - 10}px`
    if (rowCount <= 1) {
      delRowBtn.classList.add('table-edge-btn-disabled')
    }
    delRowBtn.addEventListener('click', (e) => {
      e.preventDefault()
      if (rowCount > 1) handleDeleteRow(table, rowIndex)
    })
    container.appendChild(delRowBtn)

    rowEl.addEventListener('mouseenter', () => { delRowBtn.style.opacity = '1' }, { signal })
    rowEl.addEventListener('mouseleave', () => { delRowBtn.style.opacity = '0' }, { signal })
  })

  firstRowCells.forEach((cell, colIndex) => {
    const cellEl = cell as HTMLElement

    // 底部"+"添加列按钮（现有逻辑）
    const addColBtn = document.createElement('button')
    addColBtn.className = 'table-edge-btn table-add-col-btn'
    addColBtn.textContent = '+'
    addColBtn.style.left = `${cellEl.offsetLeft + cellEl.offsetWidth / 2 - 10}px`
    addColBtn.style.transform = 'none'
    addColBtn.addEventListener('click', (e) => {
      e.preventDefault()
      handleAddCol(table, colIndex)
    })
    container.appendChild(addColBtn)

    // 顶部"−"删除列按钮（新增）
    const delColBtn = document.createElement('button')
    delColBtn.className = 'table-edge-btn table-delete-btn table-delete-col-btn'
    delColBtn.textContent = '−'
    delColBtn.style.left = `${cellEl.offsetLeft + cellEl.offsetWidth / 2 - 10}px`
    if (colCount <= 1) {
      delColBtn.classList.add('table-edge-btn-disabled')
    }
    delColBtn.addEventListener('click', (e) => {
      e.preventDefault()
      if (colCount > 1) handleDeleteCol(table, colIndex)
    })
    container.appendChild(delColBtn)

    cellEl.addEventListener('mouseenter', () => { delColBtn.style.opacity = '1' }, { signal })
    cellEl.addEventListener('mouseleave', () => { delColBtn.style.opacity = '0' }, { signal })
  })
}, [handleAddRow, handleAddCol, handleDeleteRow, handleDeleteCol])
```

- [ ] **Step 2: 确认编译通过**

```bash
npm run dev
```

Expected: 无 TypeScript 报错。

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/Editor/TableEdgeButtons.tsx
git commit -m "feat: rebuild updateButtons with delete row/col buttons and AbortController cleanup"
```

---

### Task 4: 在 wrapTable 中添加 MutationObserver

**Files:**
- Modify: `src/renderer/src/components/Editor/TableEdgeButtons.tsx`

- [ ] **Step 1: 将 `wrapTable` 整体替换为以下实现**

```typescript
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

  const observer = new MutationObserver(() => {
    setTimeout(() => updateButtons(table, buttonsContainer), 100)
  })
  observer.observe(table, { childList: true, subtree: true })
  observersRef.current.set(table, observer)
}, [updateButtons])
```

- [ ] **Step 2: 确认编译通过**

```bash
npm run dev
```

Expected: 无报错。

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/Editor/TableEdgeButtons.tsx
git commit -m "feat: add MutationObserver per table to rebuild buttons on structural change"
```

---

### Task 5: 更新 useEffect cleanup

**Files:**
- Modify: `src/renderer/src/components/Editor/TableEdgeButtons.tsx`

- [ ] **Step 1: 将 `useEffect` 的 return 改为同时清理 observers 和 abort controllers**

找到当前的 `useEffect`：

```typescript
useEffect(() => {
  const editor = editorRef.current
  if (!editor) return

  const processTables = () => {
    setTimeout(() => {
      const tables = editor.querySelectorAll('table:not(.table-edge-container table)')
      tables.forEach((table) => {
        if (!tablesRef.current.has(table as HTMLElement)) {
          wrapTable(table as HTMLElement)
        }
      })
    }, 50)
  }

  processTables()

  const handleTableAdded = () => processTables()
  window.addEventListener('oraca-table-added', handleTableAdded)
  
  return () => window.removeEventListener('oraca-table-added', handleTableAdded)
}, [editorRef, wrapTable])
```

将 return 部分替换为：

```typescript
  return () => {
    window.removeEventListener('oraca-table-added', handleTableAdded)
    observersRef.current.forEach((observer) => observer.disconnect())
    observersRef.current.clear()
    abortControllersRef.current.forEach((ac) => ac.abort())
    abortControllersRef.current.clear()
  }
```

- [ ] **Step 2: 确认编译通过**

```bash
npm run dev
```

Expected: 无报错。

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/Editor/TableEdgeButtons.tsx
git commit -m "fix: disconnect MutationObservers and abort event listeners on unmount"
```

---

### Task 6: 更新 CSS

**Files:**
- Modify: `src/renderer/src/components/Editor/TableEdgeButtons.css`

- [ ] **Step 1: 在现有 `.table-delete-btn` 规则之后追加以下 CSS**

```css
.table-delete-row-btn {
  left: -25px;
  opacity: 0;
}

.table-delete-col-btn {
  top: -25px;
  opacity: 0;
}

.table-edge-btn-disabled {
  opacity: 0.25 !important;
  cursor: not-allowed;
  pointer-events: none;
}
```

- [ ] **Step 2: 将现有 `.table-edge-btn` 的 transition 补充 opacity**

找到：

```css
.table-edge-btn {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--border-sub);
  border: 1px solid var(--border-def);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-3);
  cursor: pointer;
  pointer-events: auto;
  transition: background 0.15s ease, transform 0.15s ease;
}
```

将 transition 改为：

```css
  transition: background 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/Editor/TableEdgeButtons.css
git commit -m "style: add delete row/col button styles and disabled state"
```

---

### Task 7: 手动验证

- [ ] **Step 1: 启动应用**

```bash
npm run dev
```

- [ ] **Step 2: 验证添加行后按钮更新**

1. 在编辑器中插入一个 3×3 表格
2. 将鼠标悬停在表格上，确认右侧有 3 个 `+` 按钮、底部有 3 个 `+` 按钮
3. 点击右侧某个 `+` 添加一行
4. 确认右侧按钮变为 4 个，布局正确

- [ ] **Step 3: 验证添加列后按钮更新**

1. 点击底部某个 `+` 添加一列
2. 确认底部按钮变为 4 个

- [ ] **Step 4: 验证删除行**

1. 鼠标悬停在某一行上，确认该行左侧出现 `−` 按钮
2. 点击 `−` 按钮，确认该行被删除
3. 确认按钮 overlay 随即更新

- [ ] **Step 5: 验证删除列**

1. 鼠标悬停在第一行某个单元格，确认对应列顶部出现 `−` 按钮
2. 点击 `−` 按钮，确认该列被删除
3. 确认 overlay 随即更新

- [ ] **Step 6: 验证边界保护**

1. 减少到只剩 1 行时，确认左侧 `−` 按钮呈半透明且无法点击
2. 减少到只剩 1 列时，确认顶部 `−` 按钮同上

- [ ] **Step 7: 如发现问题，修复后 commit**

```bash
git add -p
git commit -m "fix: correct table edge button positioning or behavior"
```
