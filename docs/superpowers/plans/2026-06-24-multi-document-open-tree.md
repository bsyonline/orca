# Multi-Document Open Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user open multiple markdown documents and switch between them via a path-grouped tree shown in the left sidebar in single-file mode.

**Architecture:** The zustand store tracks an ordered list of open file paths (`openDocs`); only the active document's content is held in `activeFileContent`. Switching re-reads content from disk, relying on the existing flush-on-unmount + `MilkdownProvider` re-key behavior so the outgoing document is always written before the incoming one loads. A pure `buildOpenDocsTree` helper turns the flat path list into a nested tree, rendered by a new `OpenDocsTree` component that mirrors the existing `FileTree` styling.

**Tech Stack:** Electron + React + TypeScript, zustand, vitest + @testing-library/react.

---

## File Structure

- `src/renderer/src/store/useAppStore.ts` (modify) — add `openDocs`, extend `openFile`, add `closeDoc`.
- `src/renderer/src/lib/buildOpenDocsTree.ts` (create) — pure path-list → tree builder.
- `src/renderer/src/components/OpenDocsTree/OpenDocsTree.tsx` (create) — renders the tree, switch + close.
- `src/renderer/src/components/OpenDocsTree/OpenDocsTree.css` (create) — close-button styling on top of reused `.file-node` rules.
- `src/renderer/src/App.tsx` (modify) — render `OpenDocsTree` in single-file mode, wire select/close, manage sidebar visibility.
- Tests: `store.test.ts` (modify), `lib/__tests__/buildOpenDocsTree.test.ts` (create), `OpenDocumentSwitch.test.tsx` (modify).

---

## Task 1: Store — track open documents

**Files:**
- Modify: `src/renderer/src/store/useAppStore.ts`
- Test: `src/renderer/src/__tests__/store.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these tests to `src/renderer/src/__tests__/store.test.ts` (inside the existing `describe`, after the last test). Update the `beforeEach` reset to also clear `openDocs`:

```ts
  beforeEach(() => {
    useAppStore.setState({
      workspaceRoot: null,
      activeFile: null,
      activeFileContent: '',
      fileTree: [],
      isDirty: false,
      openDocs: [],
    })
  })

  it('openFile appends to openDocs and sets active', () => {
    useAppStore.getState().openFile('/docs/a.md', '# A')
    useAppStore.getState().openFile('/docs/b.md', '# B')
    expect(useAppStore.getState().openDocs).toEqual(['/docs/a.md', '/docs/b.md'])
    expect(useAppStore.getState().activeFile).toBe('/docs/b.md')
    expect(useAppStore.getState().activeFileContent).toBe('# B')
  })

  it('openFile does not duplicate an already-open path', () => {
    useAppStore.getState().openFile('/docs/a.md', '# A')
    useAppStore.getState().openFile('/docs/b.md', '# B')
    useAppStore.getState().openFile('/docs/a.md', '# A again')
    expect(useAppStore.getState().openDocs).toEqual(['/docs/a.md', '/docs/b.md'])
    expect(useAppStore.getState().activeFile).toBe('/docs/a.md')
  })

  it('closeDoc removes a path and returns the previous neighbor', () => {
    useAppStore.getState().openFile('/docs/a.md', '# A')
    useAppStore.getState().openFile('/docs/b.md', '# B')
    const next = useAppStore.getState().closeDoc('/docs/b.md')
    expect(next).toBe('/docs/a.md')
    expect(useAppStore.getState().openDocs).toEqual(['/docs/a.md'])
  })

  it('closeDoc on a middle doc returns the previous neighbor', () => {
    useAppStore.getState().openFile('/docs/a.md', '# A')
    useAppStore.getState().openFile('/docs/b.md', '# B')
    useAppStore.getState().openFile('/docs/c.md', '# C')
    const next = useAppStore.getState().closeDoc('/docs/b.md')
    expect(next).toBe('/docs/a.md')
    expect(useAppStore.getState().openDocs).toEqual(['/docs/a.md', '/docs/c.md'])
  })

  it('closeDoc on the first doc returns the next neighbor', () => {
    useAppStore.getState().openFile('/docs/a.md', '# A')
    useAppStore.getState().openFile('/docs/b.md', '# B')
    const next = useAppStore.getState().closeDoc('/docs/a.md')
    expect(next).toBe('/docs/b.md')
    expect(useAppStore.getState().openDocs).toEqual(['/docs/b.md'])
  })

  it('closeDoc on the last remaining doc returns null', () => {
    useAppStore.getState().openFile('/docs/a.md', '# A')
    const next = useAppStore.getState().closeDoc('/docs/a.md')
    expect(next).toBeNull()
    expect(useAppStore.getState().openDocs).toEqual([])
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- store`
Expected: FAIL — `openDocs` is undefined and `closeDoc` is not a function.

- [ ] **Step 3: Implement the store changes**

Replace the contents of `src/renderer/src/store/useAppStore.ts` with:

```ts
import { create } from 'zustand'
import type { FileNode } from '../../types'

interface AppState {
  workspaceRoot: string | null
  activeFile: string | null
  activeFileContent: string
  fileTree: FileNode[]
  isDirty: boolean
  openDocs: string[]
  setWorkspaceRoot: (root: string | null) => void
  openFile: (path: string, content: string) => void
  closeDoc: (path: string) => string | null
  setActiveFile: (path: string | null) => void
  setFileTree: (tree: FileNode[]) => void
  setIsDirty: (dirty: boolean) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  workspaceRoot: null,
  activeFile: null,
  activeFileContent: '',
  fileTree: [],
  isDirty: false,
  openDocs: [],
  setWorkspaceRoot: (root) => set({ workspaceRoot: root }),
  openFile: (path, content) =>
    set((state) => ({
      activeFile: path,
      activeFileContent: content,
      isDirty: false,
      openDocs: state.openDocs.includes(path) ? state.openDocs : [...state.openDocs, path],
    })),
  closeDoc: (path) => {
    const { openDocs } = get()
    const idx = openDocs.indexOf(path)
    if (idx === -1) return null
    const next = openDocs.filter((p) => p !== path)
    set({ openDocs: next })
    if (next.length === 0) return null
    // Prefer the previous neighbor, otherwise the new first item.
    return next[idx - 1] ?? next[0]
  },
  setActiveFile: (path) => set({ activeFile: path, isDirty: false }),
  setFileTree: (tree) => set({ fileTree: tree }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
}))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- store`
Expected: PASS (all `useAppStore` tests).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/store/useAppStore.ts src/renderer/src/__tests__/store.test.ts
git commit -m "feat: track open documents in store"
```

---

## Task 2: Path-tree builder

**Files:**
- Create: `src/renderer/src/lib/buildOpenDocsTree.ts`
- Test: `src/renderer/src/lib/__tests__/buildOpenDocsTree.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/renderer/src/lib/__tests__/buildOpenDocsTree.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildOpenDocsTree } from '../buildOpenDocsTree'

describe('buildOpenDocsTree', () => {
  it('returns a single file node for one path', () => {
    expect(buildOpenDocsTree(['/foo/a.md'])).toEqual([
      { type: 'file', name: 'a.md', path: '/foo/a.md' },
    ])
  })

  it('collapses the common directory prefix into a top group', () => {
    expect(buildOpenDocsTree(['/foo/a.md', '/foo/bar/b.md'])).toEqual([
      {
        type: 'directory',
        name: 'foo',
        children: [
          { type: 'file', name: 'a.md', path: '/foo/a.md' },
          {
            type: 'directory',
            name: 'bar',
            children: [{ type: 'file', name: 'b.md', path: '/foo/bar/b.md' }],
          },
        ],
      },
    ])
  })

  it('handles fully divergent paths with no common prefix', () => {
    const tree = buildOpenDocsTree(['/foo/a.md', '/bar/b.md'])
    expect(tree).toEqual([
      {
        type: 'directory',
        name: 'foo',
        children: [{ type: 'file', name: 'a.md', path: '/foo/a.md' }],
      },
      {
        type: 'directory',
        name: 'bar',
        children: [{ type: 'file', name: 'b.md', path: '/bar/b.md' }],
      },
    ])
  })

  it('normalizes Windows-style separators and joins the common prefix', () => {
    expect(buildOpenDocsTree(['C:\\docs\\a.md', 'C:\\docs\\sub\\b.md'])).toEqual([
      {
        type: 'directory',
        name: 'C:/docs',
        children: [
          { type: 'file', name: 'a.md', path: 'C:\\docs\\a.md' },
          {
            type: 'directory',
            name: 'sub',
            children: [{ type: 'file', name: 'b.md', path: 'C:\\docs\\sub\\b.md' }],
          },
        ],
      },
    ])
  })

  it('returns an empty array for no paths', () => {
    expect(buildOpenDocsTree([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- buildOpenDocsTree`
Expected: FAIL — cannot find module `../buildOpenDocsTree`.

- [ ] **Step 3: Implement the builder**

Create `src/renderer/src/lib/buildOpenDocsTree.ts`:

```ts
export type OpenDocTreeNode =
  | { type: 'directory'; name: string; children: OpenDocTreeNode[] }
  | { type: 'file'; name: string; path: string }

interface SplitPath {
  /** Directory segments, e.g. ['foo', 'bar']. */
  dirs: string[]
  /** File name, e.g. 'b.md'. */
  file: string
  /** Original, un-normalized path used as the leaf identity. */
  original: string
}

function splitPath(path: string): SplitPath {
  const segments = path.replace(/\\/g, '/').split('/').filter((s) => s.length > 0)
  const file = segments.pop() ?? path
  return { dirs: segments, file, original: path }
}

/**
 * Number of leading directory segments shared by every path. Used to collapse a
 * common ancestor into the top-level group instead of showing empty wrappers.
 */
function commonDirDepth(items: SplitPath[]): number {
  if (items.length === 0) return 0
  const first = items[0].dirs
  let depth = 0
  for (let i = 0; i < first.length; i++) {
    if (items.every((it) => it.dirs[i] === first[i])) depth++
    else break
  }
  return depth
}

/** Recursively build nodes from directory segments at `depth` downward. */
function buildLevel(items: SplitPath[], depth: number): OpenDocTreeNode[] {
  const files: OpenDocTreeNode[] = []
  const groups = new Map<string, SplitPath[]>()

  for (const item of items) {
    if (depth >= item.dirs.length) {
      files.push({ type: 'file', name: item.file, path: item.original })
    } else {
      const key = item.dirs[depth]
      const bucket = groups.get(key)
      if (bucket) bucket.push(item)
      else groups.set(key, [item])
    }
  }

  const dirs: OpenDocTreeNode[] = []
  for (const [name, bucket] of groups) {
    dirs.push({ type: 'directory', name, children: buildLevel(bucket, depth + 1) })
  }

  // Files first, then sub-directories, preserving insertion order within each.
  return [...files, ...dirs]
}

export function buildOpenDocsTree(paths: string[]): OpenDocTreeNode[] {
  if (paths.length === 0) return []
  const items = paths.map(splitPath)

  // A single open doc shows as a bare file (no wrapping group).
  if (items.length === 1) {
    return [{ type: 'file', name: items[0].file, path: items[0].original }]
  }

  const depth = commonDirDepth(items)
  const children = buildLevel(items, depth)

  // No shared ancestor → multiple top-level groups (divergent paths).
  if (depth === 0) return children

  // Collapse the shared ancestor into a single root group labeled by the
  // joined common prefix (e.g. 'foo' or 'C:/docs').
  const rootName = items[0].dirs.slice(0, depth).join('/')
  return [{ type: 'directory', name: rootName, children }]
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- buildOpenDocsTree`
Expected: PASS (all 5 tests).

Note on the common-prefix test: with `['/foo/a.md', '/foo/bar/b.md']`, `commonDirDepth` is 1 (both share `foo` at index 0; `a.md` has no further dir, so it stops there). Building children from depth 1 yields `a.md` plus a `bar` group, and these are wrapped in a single root group named `foo` — matching the expected tree and the chosen mockup. The "fully divergent" case has depth 0, so no wrapping group is added and two top-level groups are returned. If a test fails, re-trace the expected fixture against this logic before changing the implementation.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/lib/buildOpenDocsTree.ts src/renderer/src/lib/__tests__/buildOpenDocsTree.test.ts
git commit -m "feat: add open-docs path tree builder"
```

---

## Task 3: OpenDocsTree component

**Files:**
- Create: `src/renderer/src/components/OpenDocsTree/OpenDocsTree.tsx`
- Create: `src/renderer/src/components/OpenDocsTree/OpenDocsTree.css`
- Test: `src/renderer/src/components/OpenDocsTree/__tests__/OpenDocsTree.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/renderer/src/components/OpenDocsTree/__tests__/OpenDocsTree.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OpenDocsTree } from '../OpenDocsTree'
import { useAppStore } from '../../../store/useAppStore'

describe('OpenDocsTree', () => {
  beforeEach(() => {
    useAppStore.setState({ activeFile: '/foo/bar/b.md' })
  })

  it('renders a leaf per open document', () => {
    render(<OpenDocsTree openDocs={['/foo/a.md', '/foo/bar/b.md']} onSelect={() => {}} onClose={() => {}} />)
    expect(screen.getByText('a.md')).toBeTruthy()
    expect(screen.getByText('b.md')).toBeTruthy()
  })

  it('calls onSelect with the path when a leaf is clicked', () => {
    const onSelect = vi.fn()
    render(<OpenDocsTree openDocs={['/foo/a.md', '/foo/bar/b.md']} onSelect={onSelect} onClose={() => {}} />)
    fireEvent.click(screen.getByText('a.md'))
    expect(onSelect).toHaveBeenCalledWith('/foo/a.md')
  })

  it('calls onClose with the path when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<OpenDocsTree openDocs={['/foo/a.md', '/foo/bar/b.md']} onSelect={() => {}} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('关闭 a.md'))
    expect(onClose).toHaveBeenCalledWith('/foo/a.md')
  })

  it('does not trigger onSelect when the close button is clicked', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<OpenDocsTree openDocs={['/foo/a.md', '/foo/bar/b.md']} onSelect={onSelect} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('关闭 a.md'))
    expect(onClose).toHaveBeenCalledWith('/foo/a.md')
    expect(onSelect).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- OpenDocsTree`
Expected: FAIL — cannot find module `../OpenDocsTree`.

- [ ] **Step 3: Implement the component**

Create `src/renderer/src/components/OpenDocsTree/OpenDocsTree.css`:

```css
.open-docs-tree { display: flex; flex-direction: column; }

.open-docs-header {
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-muted, #8a857c);
}

.open-doc-leaf { position: relative; }

.open-doc-close {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: none;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  border-radius: 3px;
  cursor: pointer;
  color: var(--ink-muted, #8a857c);
  line-height: 1;
}

.open-doc-leaf:hover .open-doc-close { display: inline-flex; }
.open-doc-close:hover { background: rgba(46, 44, 40, 0.12); }
```

Create `src/renderer/src/components/OpenDocsTree/OpenDocsTree.tsx`:

```tsx
import './OpenDocsTree.css'
import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { buildOpenDocsTree, type OpenDocTreeNode } from '../../lib/buildOpenDocsTree'

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.25 3.5L8.75 7L5.25 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.625 1.75C2.625 1.40482 2.90482 1.125 3.25 1.125H8.01777C8.18291 1.125 8.34122 1.19135 8.45881 1.30806L11.191 4.02356C11.3093 4.14102 11.375 4.29917 11.375 4.46389V12.25C11.375 12.5952 11.0952 12.875 10.75 12.875H3.25C2.90482 12.875 2.625 12.5952 2.625 12.25V1.75Z" stroke="currentColor" strokeWidth="1.125" strokeLinejoin="round" />
    </svg>
  )
}

interface OpenDocsTreeProps {
  openDocs: string[]
  onSelect: (path: string) => void
  onClose: (path: string) => void
}

interface NodeProps {
  node: OpenDocTreeNode
  onSelect: (path: string) => void
  onClose: (path: string) => void
}

function TreeNode({ node, onSelect, onClose }: NodeProps) {
  const [expanded, setExpanded] = useState(true)
  const activeFile = useAppStore((s) => s.activeFile)

  if (node.type === 'directory') {
    return (
      <div>
        <div className="file-node directory" onClick={() => setExpanded((e) => !e)}>
          <span className="file-node-icon">{expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}</span>
          <span>{node.name}</span>
        </div>
        {expanded && (
          <div className="file-node-children">
            {node.children.map((child) => (
              <TreeNode
                key={child.type === 'file' ? child.path : child.name}
                node={child}
                onSelect={onSelect}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`file-node open-doc-leaf ${activeFile === node.path ? 'active' : ''}`}
      onClick={() => onSelect(node.path)}
    >
      <span className="file-node-icon">
        <FileIcon />
      </span>
      <span>{node.name}</span>
      <button
        className="open-doc-close"
        aria-label={`关闭 ${node.name}`}
        onClick={(e) => {
          e.stopPropagation()
          onClose(node.path)
        }}
      >
        ×
      </button>
    </div>
  )
}

export function OpenDocsTree({ openDocs, onSelect, onClose }: OpenDocsTreeProps) {
  const tree = buildOpenDocsTree(openDocs)

  return (
    <div className="open-docs-tree">
      <div className="file-tree-titlebar" />
      <div className="open-docs-header">打开的文档</div>
      <div className="file-tree-body">
        {tree.map((node) => (
          <TreeNode
            key={node.type === 'file' ? node.path : node.name}
            node={node}
            onSelect={onSelect}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- OpenDocsTree`
Expected: PASS (all 4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/OpenDocsTree/
git commit -m "feat: add OpenDocsTree component"
```

---

## Task 4: Wire OpenDocsTree into App

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Test: `src/renderer/src/__tests__/OpenDocumentSwitch.test.tsx`

- [ ] **Step 1: Write the failing integration tests**

In `src/renderer/src/__tests__/OpenDocumentSwitch.test.tsx`, first replace the `FileTree` mock block (lines around `vi.mock('../components/FileTree/FileTree', ...)`) by adding a sibling mock for `OpenDocsTree` so the real one is used... actually we want the REAL `OpenDocsTree`, so do NOT mock it. Leave the existing mocks as-is.

Add `openDocs: []` to the `useAppStore.setState` reset in `beforeEach`:

```ts
    useAppStore.setState({ workspaceRoot: null, fileTree: [], activeFile: null, activeFileContent: '', openDocs: [] })
```

Then add a new test after the existing one (still inside the `describe`):

```ts
  it('shows the open-docs tree at 2 docs, switches on click, and closing back to 1 hides it', async () => {
    let openFolderHandler: (() => void) | undefined
    const openFolder = vi
      .fn()
      .mockResolvedValueOnce('/docs/A.md')
      .mockResolvedValueOnce('/docs/B.md')

    Object.defineProperty(window, 'api', {
      value: makeApi({
        openFolder,
        onMenuOpenFolder: (cb: () => void) => {
          openFolderHandler = cb
          return () => {}
        },
      }),
      writable: true,
      configurable: true,
    })

    const { container } = render(<App />)

    // Open A — single doc, no open-docs tree yet.
    await act(async () => {
      openFolderHandler?.()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(container.querySelector('.open-docs-tree')).toBeNull()

    // Open B — tree appears with both docs.
    await act(async () => {
      openFolderHandler?.()
      await Promise.resolve()
      await Promise.resolve()
    })
    const tree = container.querySelector('.open-docs-tree')
    expect(tree, 'open-docs tree did not appear at 2 docs').not.toBeNull()
    expect(useAppStore.getState().openDocs).toEqual(['/docs/A.md', '/docs/B.md'])

    // Click A's leaf to switch back to A.
    await act(async () => {
      screen.getByText('A.md').click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(useAppStore.getState().activeFile).toBe('/docs/A.md')

    // Close B → back to 1 doc → tree hidden.
    await act(async () => {
      screen.getByLabelText('关闭 B.md').click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(useAppStore.getState().openDocs).toEqual(['/docs/A.md'])
    expect(container.querySelector('.open-docs-tree')).toBeNull()
  })
```

Add `screen` to the testing-library import at the top of the file:

```ts
import { render, act, screen } from '@testing-library/react'
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- OpenDocumentSwitch`
Expected: FAIL — no `.open-docs-tree` element rendered (App doesn't render `OpenDocsTree` yet).

- [ ] **Step 3: Wire OpenDocsTree into App.tsx**

In `src/renderer/src/App.tsx`:

(a) Add the import near the other component imports:

```tsx
import { OpenDocsTree } from './components/OpenDocsTree/OpenDocsTree'
```

(b) Pull `openDocs` and `closeDoc` from the store. Change the destructuring on the first line of `App`:

```tsx
  const { activeFile, activeFileContent, openFile, setFileTree, setWorkspaceRoot, setActiveFile, workspaceRoot, openDocs, closeDoc } = useAppStore()
```

(c) Add handlers for switching and closing. Insert after `handleFileSelect`:

```tsx
  const handleSwitchDoc = async (filePath: string) => {
    if (filePath === activeFile) return
    const content = await window.api.readFile(filePath)
    openFile(filePath, content)
  }

  const handleCloseDoc = async (filePath: string) => {
    const next = closeDoc(filePath)
    if (next && next !== activeFile) {
      const content = await window.api.readFile(next)
      openFile(next, content)
    } else if (!next) {
      setActiveFile(null)
    }
  }
```

(d) Make opening a 2nd document reveal the sidebar. Update the `onOpenFile` effect body so it shows the sidebar once there are multiple open docs instead of always hiding:

```tsx
  useEffect(() => {
    const cleanup = window.api.onOpenFile(async (filePath) => {
      const content = await window.api.readFile(filePath)
      openFile(filePath, content)
      // Reveal the sidebar (open-docs tree) once a 2nd doc is open; otherwise stay clean.
      setSidebarVisible(useAppStore.getState().openDocs.length >= 2)
    })
    window.api.rendererReady()
    return cleanup
  }, [])
```

And in `handleOpenFolder`, replace `setSidebarVisible(false)` inside the `isMarkdownFile` branch with the same rule:

```tsx
    if (isMarkdownFile(selectedPath)) {
      const content = await window.api.readFile(selectedPath)
      openFile(selectedPath, content)
      setSidebarVisible(useAppStore.getState().openDocs.length >= 2)
    } else {
```

(e) Render the right sidebar content by mode. Replace the sidebar block in the returned JSX:

```tsx
        {sidebarVisible && (
          <aside className="sidebar">
            {workspaceRoot ? (
              <FileTree onOpenFolder={handleOpenFolder} onFileSelect={handleFileSelect} onNewFile={handleNewFile} />
            ) : (
              <OpenDocsTree openDocs={openDocs} onSelect={handleSwitchDoc} onClose={handleCloseDoc} />
            )}
          </aside>
        )}
```

(f) Hide the sidebar when closing drops the open docs to a single file. Add this effect alongside the other `useEffect` hooks:

```tsx
  useEffect(() => {
    if (workspaceRoot === null && openDocs.length < 2) setSidebarVisible(false)
  }, [openDocs.length, workspaceRoot])
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- OpenDocumentSwitch`
Expected: PASS — both the original A→B provider test and the new tree test.

- [ ] **Step 5: Run the full test suite and type check**

Run: `npm test && npm run typecheck`
Expected: All tests pass; no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/App.tsx src/renderer/src/__tests__/OpenDocumentSwitch.test.tsx
git commit -m "feat: render open-docs tree and wire switching/closing in App"
```

---

## Self-Review Notes

- **Spec coverage:** path-tree grouping (Task 2), single-file-mode-only display (Task 4e), close single doc (Tasks 1, 3, 4), hide menu at 1 doc (Task 4f), switch on click (Tasks 3, 4c), no duplicate on reopen (Task 1), disk-as-source-of-truth via re-read (Task 4c) — all covered.
- **Type consistency:** `openDocs`, `closeDoc(path): string | null`, `openFile(path, content)`, `OpenDocTreeNode`, `buildOpenDocsTree`, and `OpenDocsTreeProps` are used identically across tasks.
- **Out of scope (unchanged):** restart persistence, folder-mode open-docs tree, drag reorder.
