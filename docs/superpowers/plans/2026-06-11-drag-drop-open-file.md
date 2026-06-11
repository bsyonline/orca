# Drag-and-Drop Open File Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to drag a single `.md` file onto the editor area to open it, with a visible drop overlay during drag.

**Architecture:** Add `isDragOver` state and three drag event handlers (`onDragOver`, `onDragLeave`, `onDrop`) to the `<main class="editor-area">` element in `App.tsx`. The drop handler reuses the existing `handleFileSelect` function. A CSS `::after` pseudo-element on `.editor-area.drag-over` renders the visual overlay.

**Tech Stack:** React 18, TypeScript, Vitest + @testing-library/react, CSS custom properties

---

## File Map

| File | Change |
|------|--------|
| `src/renderer/src/App.tsx` | Add `isDragOver` state + 3 drag handlers + update `<main>` className and props |
| `src/renderer/src/App.css` | Add `.editor-area.drag-over` and `::after` overlay styles |
| `src/renderer/src/__tests__/App.test.tsx` | Create — drag-and-drop unit tests |

---

### Task 1: Drag-and-drop handlers in App.tsx (TDD)

**Files:**
- Create: `src/renderer/src/__tests__/App.test.tsx`
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/renderer/src/__tests__/App.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, createEvent, fireEvent } from '@testing-library/react'
import App from '../App'
import { useAppStore } from '../store/useAppStore'

vi.mock('@milkdown/react', () => ({
  MilkdownProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('../components/Editor/Editor', () => ({
  Editor: () => <div data-testid="editor" />,
}))

vi.mock('../components/FileTree/FileTree', () => ({
  FileTree: () => <div data-testid="file-tree" />,
}))

const noop = () => () => {}

function makeApi(overrides: Record<string, unknown> = {}) {
  return {
    readFile: vi.fn().mockResolvedValue('# test'),
    openFolder: vi.fn(),
    newFile: vi.fn(),
    renameFile: vi.fn(),
    deleteFile: vi.fn(),
    duplicateFile: vi.fn(),
    moveFile: vi.fn(),
    revealInFinder: vi.fn(),
    insertLocalImage: vi.fn(),
    listDir: vi.fn(),
    writeFile: vi.fn(),
    saveImage: vi.fn(),
    exportHTML: vi.fn(),
    exportPDF: vi.fn(),
    exportWord: vi.fn(),
    showWordCount: vi.fn(),
    onMenuOpenFolder: noop,
    onMenuNewFile: noop,
    onMenuRenameFile: noop,
    onMenuDeleteFile: noop,
    onMenuDuplicateFile: noop,
    onMenuMoveFile: noop,
    onMenuRevealInFinder: noop,
    onMenuExportHTML: noop,
    onMenuExportPDF: noop,
    onMenuExportWord: noop,
    onMenuSave: noop,
    onMenuFormat: noop,
    onMenuParagraph: noop,
    onMenuInsertImage: noop,
    onMenuCopyMarkdown: noop,
    onMenuCopyAsText: noop,
    onMenuCopyAsHTML: noop,
    onMenuPasteAsText: noop,
    onMenuMoveLineUp: noop,
    onMenuMoveLineDown: noop,
    onMenuToggleSidebar: noop,
    onMenuToggleSourceMode: noop,
    onMenuToggleFocusMode: noop,
    onMenuToggleTypingMode: noop,
    onMenuWordCount: noop,
    ...overrides,
  }
}

describe('App drag-and-drop', () => {
  beforeEach(() => {
    useAppStore.setState({ workspaceRoot: null, fileTree: [], activeFile: null })
    Object.defineProperty(window, 'api', {
      value: makeApi(),
      writable: true,
      configurable: true,
    })
  })

  it('adds drag-over class when a file is dragged over the editor area', () => {
    render(<App />)
    const editorArea = document.querySelector('.editor-area')!

    const evt = createEvent.dragOver(editorArea)
    Object.defineProperty(evt, 'dataTransfer', {
      value: { items: [{ kind: 'file' }] },
    })
    fireEvent(editorArea, evt)

    expect(editorArea.classList.contains('drag-over')).toBe(true)
  })

  it('removes drag-over class on dragleave when pointer exits the editor area', () => {
    render(<App />)
    const editorArea = document.querySelector('.editor-area')!

    const dragOverEvt = createEvent.dragOver(editorArea)
    Object.defineProperty(dragOverEvt, 'dataTransfer', {
      value: { items: [{ kind: 'file' }] },
    })
    fireEvent(editorArea, dragOverEvt)

    const dragLeaveEvt = createEvent.dragLeave(editorArea)
    Object.defineProperty(dragLeaveEvt, 'relatedTarget', { value: null })
    fireEvent(editorArea, dragLeaveEvt)

    expect(editorArea.classList.contains('drag-over')).toBe(false)
  })

  it('opens .md file when dropped on the editor area', async () => {
    const readFile = vi.fn().mockResolvedValue('# hello')
    Object.defineProperty(window, 'api', {
      value: makeApi({ readFile }),
      writable: true,
      configurable: true,
    })

    render(<App />)
    const editorArea = document.querySelector('.editor-area')!

    const dropEvt = createEvent.drop(editorArea)
    Object.defineProperty(dropEvt, 'dataTransfer', {
      value: { files: [{ path: '/docs/test.md' }] },
    })

    await act(async () => {
      fireEvent(editorArea, dropEvt)
    })

    expect(readFile).toHaveBeenCalledWith('/docs/test.md')
  })

  it('ignores non-.md files on drop', async () => {
    const readFile = vi.fn()
    Object.defineProperty(window, 'api', {
      value: makeApi({ readFile }),
      writable: true,
      configurable: true,
    })

    render(<App />)
    const editorArea = document.querySelector('.editor-area')!

    const dropEvt = createEvent.drop(editorArea)
    Object.defineProperty(dropEvt, 'dataTransfer', {
      value: { files: [{ path: '/docs/image.png' }] },
    })

    await act(async () => {
      fireEvent(editorArea, dropEvt)
    })

    expect(readFile).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A 3 "App drag"
```

Expected: 4 tests fail — `handleDragOver`, `handleDragLeave`, `handleDrop` do not exist yet.

- [ ] **Step 3: Implement drag state and handlers in App.tsx**

Open `src/renderer/src/App.tsx`.

After the existing `const [sidebarVisible, setSidebarVisible] = useState(...)` line (line 10), add:

```tsx
const [isDragOver, setIsDragOver] = useState(false)
```

After the `handleNewFile` function (around line 34), add these three handlers:

```tsx
const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
  e.preventDefault()
  e.stopPropagation()
  if (e.dataTransfer.items[0]?.kind === 'file') {
    setIsDragOver(true)
  }
}

const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
    setIsDragOver(false)
  }
}

const handleDrop = async (e: React.DragEvent<HTMLElement>) => {
  e.preventDefault()
  e.stopPropagation()
  setIsDragOver(false)
  const file = e.dataTransfer.files[0] as File & { path: string }
  if (!file?.path?.endsWith('.md')) return
  await handleFileSelect(file.path)
}
```

Then change the `<main>` element (currently line 116):

```tsx
// Before:
<main className="editor-area">

// After:
<main
  className={`editor-area${isDragOver ? ' drag-over' : ''}`}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A 3 "App drag"
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/__tests__/App.test.tsx src/renderer/src/App.tsx
git commit -m "feat: add drag-and-drop to open .md files in editor area"
```

---

### Task 2: CSS drag-over overlay styles

**Files:**
- Modify: `src/renderer/src/App.css`

- [ ] **Step 1: Add drag-over overlay styles to App.css**

Append to the end of `src/renderer/src/App.css`:

```css
.editor-area.drag-over {
  position: relative;
}

.editor-area.drag-over::after {
  content: '松开以打开文件';
  position: absolute;
  inset: 0;
  background: rgba(58, 56, 51, 0.06);
  border: 2px dashed var(--accent);
  border-radius: 12px 0 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: var(--ink-2);
  z-index: 100;
  pointer-events: none;
}
```

- [ ] **Step 2: Start the dev server and verify visually**

```bash
npm run dev
```

Open the app, drag a `.md` file from Finder onto the editor area. Verify:
- A semi-transparent overlay with dashed border appears while dragging
- "松开以打开文件" text is centered
- On drop, the overlay disappears and the file opens in the editor
- Dragging a non-.md file shows no overlay

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/App.css
git commit -m "feat: add drag-over visual overlay style to editor area"
```
