# Markdown Editor Desktop App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Typora-alternative desktop Markdown editor (Electron + React + Milkdown) with WYSIWYG editing, fixed file tree sidebar, code syntax highlighting, LaTeX math, image paste/drag, and PDF/HTML/Word export.

**Architecture:** Electron main process handles all file system operations and PDF export via IPC; renderer process (React + Milkdown) handles UI and WYSIWYG editing. `preload.ts` exposes a typed `window.api` surface via `contextBridge`. Zustand holds app state. No Node.js APIs are used directly in renderer code.

**Tech Stack:** Electron, electron-vite, React 18, TypeScript, `@milkdown/kit`, `@milkdown/react`, `@milkdown/plugin-math`, Zustand, docx, KaTeX, Prism.js, unified, remark-parse, remark-html, Vitest, @testing-library/react

---

## File Map

| File | Responsibility |
|------|----------------|
| `electron/main.ts` | Window creation, app lifecycle, IPC handler registration, native menu |
| `electron/preload.ts` | `contextBridge`: exposes typed `window.api` to renderer |
| `electron/handlers/file.ts` | IPC: openFolder, listDir, readFile, writeFile, saveImage |
| `electron/handlers/export.ts` | IPC: exportHTML, exportPDF (printToPDF), exportWord |
| `src/types/index.ts` | `FileNode`, `ElectronAPI` TypeScript interfaces |
| `src/store/useAppStore.ts` | Zustand store: workspaceRoot, activeFile, fileTree, isDirty |
| `src/lib/pathUtils.ts` | Renderer-safe `basename` and `dirname` (no Node.js path module) |
| `src/lib/imageHandler.ts` | Image paste/drag: convert to base64, call IPC, return md path |
| `src/lib/exporters/html.ts` | Markdown → standalone HTML document string |
| `src/lib/exporters/word.ts` | Markdown → `.docx` Uint8Array via `docx` package |
| `src/components/FileTree/FileTree.tsx` | File tree root: open folder button + node list |
| `src/components/FileTree/FileNode.tsx` | Single file/folder node (expand/collapse, click) |
| `src/components/FileTree/FileTree.css` | Sidebar and file node styles |
| `src/components/StatusBar/StatusBar.tsx` | Active filename + dirty indicator |
| `src/components/StatusBar/StatusBar.css` | Status bar styles |
| `src/components/Editor/Editor.tsx` | Milkdown WYSIWYG wrapper, auto-save, export keyboard shortcuts |
| `src/components/Editor/Editor.css` | Editor typography and markdown element styles |
| `src/App.tsx` | Root layout: sidebar + editor area + status bar |
| `src/App.css` | CSS variables (light theme), global layout |
| `src/__tests__/store.test.ts` | Zustand store unit tests |
| `src/__tests__/pathUtils.test.ts` | pathUtils unit tests |
| `src/__tests__/imageHandler.test.ts` | imageHandler unit tests |
| `src/__tests__/html.test.ts` | HTML exporter unit tests |
| `src/__tests__/word.test.ts` | Word exporter unit tests |
| `src/__tests__/FileTree.test.tsx` | FileTree component tests |
| `src/__tests__/StatusBar.test.tsx` | StatusBar component tests |
| `electron-builder.config.ts` | macOS .dmg build configuration |

**Task dependency order:** types → pathUtils → store → preload → file handlers → export handlers → main process → app layout → FileTree → StatusBar → imageHandler → HTML exporter → Word exporter → Editor (imports all of the above) → integration test → build.

---

## Task 1: Project Scaffold

**Files:**
- Create: project root (via scaffold)
- Create: `src/test-setup.ts`

- [ ] **Step 1: Scaffold the project**

```bash
npm create @quick-start/electron@latest orca -- --template react-ts
cd orca
npm install
```

- [ ] **Step 2: Verify dev mode works**

```bash
npm run dev
```

Expected: Electron window opens with default template. No errors in console.

- [ ] **Step 3: Install dependencies**

```bash
npm install @milkdown/kit @milkdown/react @milkdown/plugin-math zustand docx katex prismjs unified remark-parse remark-html
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/prismjs @types/katex
```

- [ ] **Step 4: Create test setup file**

Create `src/test-setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Enable Vitest in renderer vite config**

Open `vite.config.ts` (the renderer config — in electron-vite it may be the root `vite.config.ts` or under the `renderer` key in `electron.vite.config.ts`). Add a `test` block:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

If the project uses `electron.vite.config.ts` with a `renderer` key, add `test` inside the renderer config object.

- [ ] **Step 6: Add test scripts to package.json**

Ensure `package.json` has:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 7: Verify test setup works**

```bash
npm test
```

Expected: "No test files found" or empty suite — confirms Vitest is wired without errors.

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold electron-vite react-ts project with Vitest"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create types file**

Create `src/types/index.ts`:
```typescript
export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

export interface ElectronAPI {
  openFolder: () => Promise<string | null>
  listDir: (dirPath: string) => Promise<FileNode[]>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<void>
  saveImage: (destDir: string, imageData: string, ext: string) => Promise<string>
  exportHTML: (filePath: string, html: string) => Promise<void>
  exportPDF: (filePath: string) => Promise<void>
  exportWord: (filePath: string, buffer: Uint8Array) => Promise<void>
  onMenuOpenFolder: (callback: () => void) => () => void
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Renderer-Safe Path Utils

**Files:**
- Create: `src/lib/pathUtils.ts`
- Create: `src/__tests__/pathUtils.test.ts`

The renderer runs in Chromium with no access to Node.js. Never import `node:path` in renderer files — use these utilities instead.

- [ ] **Step 1: Write failing test**

Create `src/__tests__/pathUtils.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { basename, dirname } from '../lib/pathUtils'

describe('basename', () => {
  it('returns filename from Unix path', () => {
    expect(basename('/Users/me/docs/note.md')).toBe('note.md')
  })

  it('strips extension when provided', () => {
    expect(basename('/docs/note.md', '.md')).toBe('note')
  })

  it('handles filename with no directory', () => {
    expect(basename('note.md')).toBe('note.md')
  })
})

describe('dirname', () => {
  it('returns directory portion of file path', () => {
    expect(dirname('/Users/me/docs/note.md')).toBe('/Users/me/docs')
  })

  it('returns empty string for root-level path', () => {
    expect(dirname('/note.md')).toBe('')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test
```

Expected: FAIL — `../lib/pathUtils` not found.

- [ ] **Step 3: Implement pathUtils.ts**

Create `src/lib/pathUtils.ts`:
```typescript
export function basename(filePath: string, ext?: string): string {
  const name = filePath.replace(/\\/g, '/').split('/').pop() ?? filePath
  if (ext && name.endsWith(ext)) return name.slice(0, -ext.length)
  return name
}

export function dirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  if (idx <= 0) return ''
  return normalized.slice(0, idx)
}
```

- [ ] **Step 4: Run tests to verify passing**

```bash
npm test
```

Expected: PASS — all 5 pathUtils tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pathUtils.ts src/__tests__/pathUtils.test.ts
git commit -m "feat: add renderer-safe path utilities"
```

---

## Task 4: Zustand Store

**Files:**
- Create: `src/store/useAppStore.ts`
- Create: `src/__tests__/store.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/store.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../store/useAppStore'

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({ workspaceRoot: null, activeFile: null, fileTree: [], isDirty: false })
  })

  it('sets workspaceRoot', () => {
    useAppStore.getState().setWorkspaceRoot('/Users/me/docs')
    expect(useAppStore.getState().workspaceRoot).toBe('/Users/me/docs')
  })

  it('sets activeFile and clears isDirty', () => {
    useAppStore.getState().setIsDirty(true)
    useAppStore.getState().setActiveFile('/docs/note.md')
    expect(useAppStore.getState().activeFile).toBe('/docs/note.md')
    expect(useAppStore.getState().isDirty).toBe(false)
  })

  it('sets isDirty', () => {
    useAppStore.getState().setIsDirty(true)
    expect(useAppStore.getState().isDirty).toBe(true)
  })

  it('sets fileTree', () => {
    const tree = [{ name: 'note.md', path: '/docs/note.md', type: 'file' as const }]
    useAppStore.getState().setFileTree(tree)
    expect(useAppStore.getState().fileTree).toEqual(tree)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement store**

Create `src/store/useAppStore.ts`:
```typescript
import { create } from 'zustand'
import type { FileNode } from '../types'

interface AppState {
  workspaceRoot: string | null
  activeFile: string | null
  fileTree: FileNode[]
  isDirty: boolean
  setWorkspaceRoot: (root: string | null) => void
  setActiveFile: (path: string | null) => void
  setFileTree: (tree: FileNode[]) => void
  setIsDirty: (dirty: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  workspaceRoot: null,
  activeFile: null,
  fileTree: [],
  isDirty: false,
  setWorkspaceRoot: (root) => set({ workspaceRoot: root }),
  setActiveFile: (path) => set({ activeFile: path, isDirty: false }),
  setFileTree: (tree) => set({ fileTree: tree }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
}))
```

- [ ] **Step 4: Run tests to verify passing**

```bash
npm test
```

Expected: PASS — all 4 store tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts src/__tests__/store.test.ts
git commit -m "feat: add Zustand app store"
```

---

## Task 5: Preload Bridge

**Files:**
- Modify: `electron/preload.ts`

- [ ] **Step 1: Replace preload.ts**

Replace the entire contents of `electron/preload.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../src/types'

const api: ElectronAPI = {
  openFolder: () => ipcRenderer.invoke('file:openFolder'),
  listDir: (dirPath) => ipcRenderer.invoke('file:listDir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('file:readFile', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('file:writeFile', filePath, content),
  saveImage: (destDir, imageData, ext) => ipcRenderer.invoke('file:saveImage', destDir, imageData, ext),
  exportHTML: (filePath, html) => ipcRenderer.invoke('export:html', filePath, html),
  exportPDF: (filePath) => ipcRenderer.invoke('export:pdf', filePath),
  exportWord: (filePath, buffer) => ipcRenderer.invoke('export:word', filePath, buffer),
  onMenuOpenFolder: (callback) => {
    ipcRenderer.on('menu:openFolder', callback)
    return () => ipcRenderer.removeListener('menu:openFolder', callback)
  },
}

contextBridge.exposeInMainWorld('api', api)
```

- [ ] **Step 2: Commit**

```bash
git add electron/preload.ts
git commit -m "feat: expose IPC bridge via contextBridge"
```

---

## Task 6: File System Handlers

**Files:**
- Create: `electron/handlers/file.ts`

- [ ] **Step 1: Create electron/handlers/file.ts**

```typescript
import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { FileNode } from '../../src/types'

function buildFileTree(dirPath: string): FileNode[] {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((e) => !e.name.startsWith('.'))
    .map((e): FileNode => {
      const fullPath = path.join(dirPath, e.name)
      if (e.isDirectory()) {
        return { name: e.name, path: fullPath, type: 'directory', children: buildFileTree(fullPath) }
      }
      return { name: e.name, path: fullPath, type: 'file' }
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

export function registerFileHandlers(win: BrowserWindow): void {
  ipcMain.handle('file:openFolder', async () => {
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('file:listDir', (_event, dirPath: string) => buildFileTree(dirPath))

  ipcMain.handle('file:readFile', (_event, filePath: string) =>
    fs.readFileSync(filePath, 'utf-8'),
  )

  ipcMain.handle('file:writeFile', (_event, filePath: string, content: string) => {
    fs.writeFileSync(filePath, content, 'utf-8')
  })

  ipcMain.handle('file:saveImage', (_event, destDir: string, imageData: string, ext: string) => {
    const assetsDir = path.join(destDir, 'assets')
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true })
    const filename = `image-${Date.now()}.${ext}`
    fs.writeFileSync(path.join(assetsDir, filename), Buffer.from(imageData, 'base64'))
    return `./assets/${filename}`
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/handlers/file.ts
git commit -m "feat: implement file system IPC handlers"
```

---

## Task 7: Export Handlers

**Files:**
- Create: `electron/handlers/export.ts`

- [ ] **Step 1: Create electron/handlers/export.ts**

```typescript
import { ipcMain, BrowserWindow } from 'electron'
import fs from 'node:fs'

export function registerExportHandlers(win: BrowserWindow): void {
  ipcMain.handle('export:html', (_event, filePath: string, html: string) => {
    fs.writeFileSync(filePath, html, 'utf-8')
  })

  ipcMain.handle('export:pdf', async (_event, filePath: string) => {
    const data = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 1, bottom: 1, left: 1, right: 1 },
    })
    fs.writeFileSync(filePath, data)
  })

  ipcMain.handle('export:word', (_event, filePath: string, buffer: Uint8Array) => {
    fs.writeFileSync(filePath, Buffer.from(buffer))
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/handlers/export.ts
git commit -m "feat: implement export IPC handlers (PDF, HTML, Word)"
```

---

## Task 8: Main Process Entry

**Files:**
- Modify: `electron/main.ts`

- [ ] **Step 1: Replace electron/main.ts**

```typescript
import { app, BrowserWindow, Menu, MenuItem } from 'electron'
import path from 'node:path'
import { registerFileHandlers } from './handlers/file'
import { registerExportHandlers } from './handlers/export'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  registerFileHandlers(win)
  registerExportHandlers(win)
  buildMenu(win)

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return win
}

function buildMenu(win: BrowserWindow): void {
  const menu = new Menu()
  menu.append(new MenuItem({
    label: app.name,
    submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }],
  }))
  menu.append(new MenuItem({
    label: '文件',
    submenu: [
      { label: '打开文件夹', accelerator: 'CmdOrCtrl+O', click: () => win.webContents.send('menu:openFolder') },
      { type: 'separator' },
      { label: '导出为 HTML', accelerator: 'CmdOrCtrl+Shift+H', click: () => win.webContents.send('menu:exportHTML') },
      { label: '导出为 PDF', accelerator: 'CmdOrCtrl+Shift+P', click: () => win.webContents.send('menu:exportPDF') },
      { label: '导出为 Word', accelerator: 'CmdOrCtrl+Shift+W', click: () => win.webContents.send('menu:exportWord') },
    ],
  }))
  menu.append(new MenuItem({ label: '编辑', role: 'editMenu' }))
  menu.append(new MenuItem({ label: '视图', role: 'viewMenu' }))
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 2: Run dev to verify**

```bash
npm run dev
```

Expected: Electron window opens. Native menu bar shows "文件" menu with keyboard shortcuts. No console errors.

- [ ] **Step 3: Commit**

```bash
git add electron/main.ts
git commit -m "feat: wire main process with handlers and native menu"
```

---

## Task 9: App Layout & Global Styles

**Files:**
- Create: `src/App.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create src/App.css**

```css
:root {
  --sidebar-width: 240px;
  --sidebar-bg: #f5f5f5;
  --sidebar-border: #e0e0e0;
  --editor-bg: #ffffff;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --accent: #2563eb;
  --statusbar-bg: #f0f0f0;
  --statusbar-height: 24px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--editor-bg);
  color: var(--text-primary);
  height: 100vh;
  overflow: hidden;
}

.app { display: flex; flex-direction: column; height: 100vh; }
.app-body { display: flex; flex: 1; overflow: hidden; }

.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  overflow-y: auto;
}

.editor-area { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

.editor-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: 14px;
}
```

- [ ] **Step 2: Replace src/App.tsx**

```tsx
import './App.css'
import { useState, useEffect } from 'react'
import { MilkdownProvider } from '@milkdown/react'
import { FileTree } from './components/FileTree/FileTree'
import { Editor } from './components/Editor/Editor'
import { StatusBar } from './components/StatusBar/StatusBar'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const { activeFile, setActiveFile, setFileTree, setWorkspaceRoot } = useAppStore()
  const [fileContent, setFileContent] = useState<string>('')

  const handleOpenFolder = async () => {
    const folderPath = await window.api.openFolder()
    if (!folderPath) return
    setWorkspaceRoot(folderPath)
    const tree = await window.api.listDir(folderPath)
    setFileTree(tree)
  }

  const handleFileSelect = async (filePath: string) => {
    const content = await window.api.readFile(filePath)
    setFileContent(content)
    setActiveFile(filePath)
  }

  useEffect(() => {
    const cleanup = window.api.onMenuOpenFolder(handleOpenFolder)
    return cleanup
  }, [])

  return (
    <MilkdownProvider>
      <div className="app">
        <div className="app-body">
          <aside className="sidebar">
            <FileTree onOpenFolder={handleOpenFolder} onFileSelect={handleFileSelect} />
          </aside>
          <main className="editor-area">
            {activeFile ? (
              <Editor key={activeFile} filePath={activeFile} initialContent={fileContent} />
            ) : (
              <div className="editor-empty">从左侧打开文件夹，选择一个 .md 文件开始编辑</div>
            )}
          </main>
        </div>
        <StatusBar />
      </div>
    </MilkdownProvider>
  )
}
```

Note: `key={activeFile}` on `<Editor>` forces a remount when switching files, ensuring Milkdown loads the new file's content correctly.

- [ ] **Step 3: Run dev to verify layout renders**

```bash
npm run dev
```

Expected: Sidebar + main area + status bar visible. Empty state message shown in the editor area.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/App.css
git commit -m "feat: implement app layout"
```

---

## Task 10: FileTree Component

**Files:**
- Create: `src/components/FileTree/FileTree.css`
- Create: `src/components/FileTree/FileNode.tsx`
- Create: `src/components/FileTree/FileTree.tsx`
- Create: `src/__tests__/FileTree.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/FileTree.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileTree } from '../components/FileTree/FileTree'
import { useAppStore } from '../store/useAppStore'

describe('FileTree', () => {
  it('shows "打开文件夹" button when no workspace', () => {
    useAppStore.setState({ workspaceRoot: null, fileTree: [], activeFile: null })
    render(<FileTree onOpenFolder={vi.fn()} onFileSelect={vi.fn()} />)
    expect(screen.getByText('打开文件夹')).toBeInTheDocument()
  })

  it('renders .md files from fileTree', () => {
    useAppStore.setState({
      workspaceRoot: '/docs',
      fileTree: [{ name: 'note.md', path: '/docs/note.md', type: 'file' }],
      activeFile: null,
    })
    render(<FileTree onOpenFolder={vi.fn()} onFileSelect={vi.fn()} />)
    expect(screen.getByText('note.md')).toBeInTheDocument()
  })

  it('calls onFileSelect when a file is clicked', () => {
    const onFileSelect = vi.fn()
    useAppStore.setState({
      workspaceRoot: '/docs',
      fileTree: [{ name: 'note.md', path: '/docs/note.md', type: 'file' }],
      activeFile: null,
    })
    render(<FileTree onOpenFolder={vi.fn()} onFileSelect={onFileSelect} />)
    fireEvent.click(screen.getByText('note.md'))
    expect(onFileSelect).toHaveBeenCalledWith('/docs/note.md')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test
```

Expected: FAIL — component not found.

- [ ] **Step 3: Create FileTree.css**

Create `src/components/FileTree/FileTree.css`:
```css
.file-tree { padding: 8px 0; }

.file-tree-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--sidebar-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.open-folder-btn {
  display: block;
  margin: 16px auto;
  padding: 8px 16px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.open-folder-btn:hover { opacity: 0.9; }

.open-folder-btn-sm {
  padding: 2px 8px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}

.file-node {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  gap: 6px;
  user-select: none;
}

.file-node:hover { background: rgba(0, 0, 0, 0.05); }
.file-node.active { background: rgba(37, 99, 235, 0.1); color: var(--accent); }
.file-node.directory { font-weight: 500; }
.file-node-children { padding-left: 12px; }
```

- [ ] **Step 4: Create FileNode.tsx**

Create `src/components/FileTree/FileNode.tsx`:
```tsx
import { useState } from 'react'
import type { FileNode as FileNodeType } from '../../types'
import { useAppStore } from '../../store/useAppStore'

interface FileNodeProps {
  node: FileNodeType
  onFileSelect: (path: string) => void
}

export function FileNode({ node, onFileSelect }: FileNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const activeFile = useAppStore((s) => s.activeFile)

  if (node.type === 'directory') {
    return (
      <div>
        <div className="file-node directory" onClick={() => setExpanded((e) => !e)}>
          <span>{expanded ? '▾' : '▸'}</span>
          <span>{node.name}</span>
        </div>
        {expanded && node.children && (
          <div className="file-node-children">
            {node.children.map((child) => (
              <FileNode key={child.path} node={child} onFileSelect={onFileSelect} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!node.name.endsWith('.md')) return null

  return (
    <div
      className={`file-node ${activeFile === node.path ? 'active' : ''}`}
      onClick={() => onFileSelect(node.path)}
    >
      <span>📄</span>
      <span>{node.name}</span>
    </div>
  )
}
```

- [ ] **Step 5: Create FileTree.tsx**

Create `src/components/FileTree/FileTree.tsx`:
```tsx
import './FileTree.css'
import { useAppStore } from '../../store/useAppStore'
import { FileNode } from './FileNode'
import { basename } from '../../lib/pathUtils'

interface FileTreeProps {
  onOpenFolder: () => void
  onFileSelect: (path: string) => void
}

export function FileTree({ onOpenFolder, onFileSelect }: FileTreeProps) {
  const { workspaceRoot, fileTree } = useAppStore()

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span>{workspaceRoot ? basename(workspaceRoot) : '文件'}</span>
        <button className="open-folder-btn-sm" onClick={onOpenFolder}>打开</button>
      </div>
      {!workspaceRoot && (
        <button className="open-folder-btn" onClick={onOpenFolder}>打开文件夹</button>
      )}
      {fileTree.map((node) => (
        <FileNode key={node.path} node={node} onFileSelect={onFileSelect} />
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Run tests to verify passing**

```bash
npm test
```

Expected: PASS — all 3 FileTree tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/FileTree/ src/__tests__/FileTree.test.tsx
git commit -m "feat: implement FileTree component"
```

---

## Task 11: StatusBar Component

**Files:**
- Create: `src/components/StatusBar/StatusBar.css`
- Create: `src/components/StatusBar/StatusBar.tsx`
- Create: `src/__tests__/StatusBar.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/StatusBar.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBar } from '../components/StatusBar/StatusBar'
import { useAppStore } from '../store/useAppStore'

describe('StatusBar', () => {
  it('shows filename when a file is active', () => {
    useAppStore.setState({ activeFile: '/docs/note.md', isDirty: false })
    render(<StatusBar />)
    expect(screen.getByText('note.md')).toBeInTheDocument()
  })

  it('shows dirty dot when isDirty is true', () => {
    useAppStore.setState({ activeFile: '/docs/note.md', isDirty: true })
    render(<StatusBar />)
    expect(screen.getByText('●')).toBeInTheDocument()
  })

  it('renders no filename element when no file is active', () => {
    useAppStore.setState({ activeFile: null, isDirty: false })
    const { container } = render(<StatusBar />)
    expect(container.querySelector('.filename')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test
```

Expected: FAIL — component not found.

- [ ] **Step 3: Create StatusBar.css**

Create `src/components/StatusBar/StatusBar.css`:
```css
.statusbar {
  height: var(--statusbar-height);
  background: var(--statusbar-bg);
  border-top: 1px solid var(--sidebar-border);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 8px;
  font-size: 11px;
  color: var(--text-secondary);
}

.statusbar .filename { font-weight: 500; }
.statusbar .dirty { color: #f59e0b; }
```

- [ ] **Step 4: Create StatusBar.tsx**

Create `src/components/StatusBar/StatusBar.tsx`:
```tsx
import './StatusBar.css'
import { useAppStore } from '../../store/useAppStore'
import { basename } from '../../lib/pathUtils'

export function StatusBar() {
  const { activeFile, isDirty } = useAppStore()
  const filename = activeFile ? basename(activeFile) : null

  return (
    <div className="statusbar">
      {filename && (
        <>
          {isDirty && <span className="dirty">●</span>}
          <span className="filename">{filename}</span>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify passing**

```bash
npm test
```

Expected: PASS — all 3 StatusBar tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/StatusBar/ src/__tests__/StatusBar.test.tsx
git commit -m "feat: implement StatusBar with filename and dirty indicator"
```

---

## Task 12: Image Paste & Drag Handler

**Files:**
- Create: `src/lib/imageHandler.ts`
- Create: `src/__tests__/imageHandler.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/imageHandler.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { dataUrlToBase64, getImageExt } from '../lib/imageHandler'

describe('dataUrlToBase64', () => {
  it('extracts base64 payload from data URL', () => {
    expect(dataUrlToBase64('data:image/png;base64,abc123==')).toBe('abc123==')
  })
})

describe('getImageExt', () => {
  it('returns png for image/png', () => { expect(getImageExt('image/png')).toBe('png') })
  it('returns jpg for image/jpeg', () => { expect(getImageExt('image/jpeg')).toBe('jpg') })
  it('returns gif for image/gif', () => { expect(getImageExt('image/gif')).toBe('gif') })
  it('returns webp for image/webp', () => { expect(getImageExt('image/webp')).toBe('webp') })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement imageHandler.ts**

Create `src/lib/imageHandler.ts`:
```typescript
import { dirname } from './pathUtils'

export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(',')[1]
}

export function getImageExt(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
  }
  return map[mimeType] ?? mimeType.split('/')[1] ?? 'png'
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.readAsDataURL(file)
  })
}

async function saveImageFile(dataUrl: string, mimeType: string, filePath: string): Promise<string | null> {
  try {
    const base64 = dataUrlToBase64(dataUrl)
    const ext = getImageExt(mimeType)
    const destDir = dirname(filePath)
    return await window.api.saveImage(destDir, base64, ext)
  } catch {
    return null
  }
}

export async function handleImagePaste(e: React.ClipboardEvent, filePath: string): Promise<void> {
  const items = Array.from(e.clipboardData.items)
  for (const item of items) {
    if (!item.type.startsWith('image/')) continue
    e.preventDefault()
    const file = item.getAsFile()
    if (!file) continue
    const dataUrl = await readFileAsDataUrl(file)
    const relativePath = await saveImageFile(dataUrl, item.type, filePath)
    if (relativePath) document.execCommand('insertText', false, `![](${relativePath})`)
    break
  }
}

export async function handleImageDrop(e: React.DragEvent, filePath: string): Promise<void> {
  const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
  if (files.length === 0) return
  e.preventDefault()
  const file = files[0]
  const dataUrl = await readFileAsDataUrl(file)
  const relativePath = await saveImageFile(dataUrl, file.type, filePath)
  if (relativePath) document.execCommand('insertText', false, `![](${relativePath})`)
}
```

- [ ] **Step 4: Run tests to verify passing**

```bash
npm test
```

Expected: PASS — all 5 imageHandler tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/imageHandler.ts src/__tests__/imageHandler.test.ts
git commit -m "feat: implement image paste and drag handling"
```

---

## Task 13: HTML Exporter

**Files:**
- Create: `src/lib/exporters/html.ts`
- Create: `src/__tests__/html.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/html.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { buildHTMLDocument } from '../lib/exporters/html'

describe('buildHTMLDocument', () => {
  it('produces a valid HTML document', () => {
    const result = buildHTMLDocument('<p>Hello</p>', 'My Doc')
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).toContain('<p>Hello</p>')
  })

  it('sets the document title', () => {
    const result = buildHTMLDocument('<p>x</p>', 'My Title')
    expect(result).toContain('<title>My Title</title>')
  })

  it('inlines CSS styles', () => {
    const result = buildHTMLDocument('<p>text</p>', 'Doc')
    expect(result).toContain('<style>')
    expect(result).toContain('font-family')
  })

  it('escapes HTML characters in the title', () => {
    const result = buildHTMLDocument('<p>x</p>', '<script>')
    expect(result).toContain('&lt;script&gt;')
    expect(result).not.toContain('<title><script>')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement html.ts**

Create `src/lib/exporters/html.ts`:
```typescript
const PRINT_CSS = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 24px; line-height: 1.75; color: #1a1a1a; }
  h1 { font-size: 2em; margin: 1em 0 0.5em; }
  h2 { font-size: 1.5em; margin: 1em 0 0.4em; }
  h3 { font-size: 1.25em; margin: 0.8em 0 0.3em; }
  p { margin: 0.6em 0; }
  code { background: #f0f0f0; border-radius: 3px; padding: 2px 5px; font-family: monospace; font-size: 0.88em; }
  pre { background: #f6f8fa; border: 1px solid #e8e8e8; border-radius: 6px; padding: 16px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 4px solid #ddd; padding-left: 16px; color: #666; margin: 1em 0; }
  img { max-width: 100%; }
  a { color: #2563eb; text-decoration: none; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; }
  th { background: #f5f5f5; font-weight: 600; }
  ul, ol { padding-left: 1.5em; }
`

function escapeHTML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function buildHTMLDocument(bodyHTML: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
${bodyHTML}
</body>
</html>`
}
```

- [ ] **Step 4: Run tests to verify passing**

```bash
npm test
```

Expected: PASS — all 4 HTML exporter tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/exporters/html.ts src/__tests__/html.test.ts
git commit -m "feat: implement HTML exporter"
```

---

## Task 14: Word Exporter

**Files:**
- Create: `src/lib/exporters/word.ts`
- Create: `src/__tests__/word.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/word.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { markdownToDocxBuffer } from '../lib/exporters/word'

describe('markdownToDocxBuffer', () => {
  it('returns a non-empty Uint8Array', async () => {
    const buffer = await markdownToDocxBuffer('# Hello\n\nParagraph text.')
    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('handles empty markdown without throwing', async () => {
    const buffer = await markdownToDocxBuffer('')
    expect(buffer).toBeInstanceOf(Uint8Array)
  })

  it('handles multiple heading levels', async () => {
    const buffer = await markdownToDocxBuffer('# H1\n## H2\n### H3\n\nParagraph.')
    expect(buffer.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement word.ts**

Create `src/lib/exporters/word.ts`:
```typescript
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

function parseLine(line: string): Paragraph {
  if (line.startsWith('# ')) {
    return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(line.slice(2))] })
  }
  if (line.startsWith('## ')) {
    return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(line.slice(3))] })
  }
  if (line.startsWith('### ')) {
    return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(line.slice(4))] })
  }
  if (line.startsWith('> ')) {
    return new Paragraph({ indent: { left: 720 }, children: [new TextRun({ text: line.slice(2), italics: true })] })
  }
  if (line === '') {
    return new Paragraph('')
  }
  const inlineText = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1')
  return new Paragraph({ children: [new TextRun(inlineText)] })
}

export async function markdownToDocxBuffer(markdown: string): Promise<Uint8Array> {
  const lines = markdown.split('\n')
  const doc = new Document({
    sections: [{ children: lines.map(parseLine) }],
  })
  const buffer = await Packer.toBuffer(doc)
  return new Uint8Array(buffer)
}
```

- [ ] **Step 4: Run tests to verify passing**

```bash
npm test
```

Expected: PASS — all 3 word exporter tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/exporters/word.ts src/__tests__/word.test.ts
git commit -m "feat: implement Word exporter"
```

---

## Task 15: Milkdown Editor Component

All dependencies now exist: `imageHandler`, `html.ts`, `word.ts`, `pathUtils`, `useAppStore`.

**Files:**
- Create: `src/components/Editor/Editor.css`
- Create: `src/components/Editor/Editor.tsx`

- [ ] **Step 1: Create Editor.css**

Create `src/components/Editor/Editor.css`:
```css
.editor-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 48px 80px;
  max-width: 860px;
  margin: 0 auto;
  width: 100%;
}

.milkdown { outline: none; font-size: 16px; line-height: 1.75; color: var(--text-primary); }

.milkdown h1 { font-size: 2em; margin: 1em 0 0.5em; font-weight: 700; }
.milkdown h2 { font-size: 1.5em; margin: 1em 0 0.4em; font-weight: 600; }
.milkdown h3 { font-size: 1.25em; margin: 0.8em 0 0.3em; font-weight: 600; }
.milkdown p { margin: 0.6em 0; }

.milkdown code {
  background: #f0f0f0;
  border-radius: 3px;
  padding: 2px 5px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 0.88em;
}

.milkdown pre {
  background: #f6f8fa;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
  margin: 1em 0;
}

.milkdown pre code { background: none; padding: 0; font-size: 0.9em; }

.milkdown blockquote {
  border-left: 4px solid #ddd;
  padding-left: 16px;
  color: var(--text-secondary);
  margin: 1em 0;
}

.milkdown img { max-width: 100%; border-radius: 4px; margin: 0.5em 0; }
.milkdown a { color: var(--accent); text-decoration: none; }
.milkdown a:hover { text-decoration: underline; }

.milkdown table { border-collapse: collapse; width: 100%; margin: 1em 0; }
.milkdown th, .milkdown td { border: 1px solid #ddd; padding: 8px 12px; }
.milkdown th { background: #f5f5f5; font-weight: 600; }

.milkdown ul, .milkdown ol { padding-left: 1.5em; margin: 0.5em 0; }
.milkdown li { margin: 0.2em 0; }
```

- [ ] **Step 2: Create Editor.tsx**

Create `src/components/Editor/Editor.tsx`:
```tsx
import './Editor.css'
import { useEffect, useCallback, useRef } from 'react'
import { Editor as MilkdownCoreEditor, rootCtx, defaultValueCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { prism } from '@milkdown/kit/plugin/prism'
import { math } from '@milkdown/plugin-math'
import { Milkdown, useEditor, useInstance } from '@milkdown/react'
import { getMarkdown } from '@milkdown/kit/utils'
import { useAppStore } from '../../store/useAppStore'
import { handleImagePaste, handleImageDrop } from '../../lib/imageHandler'
import { buildHTMLDocument } from '../../lib/exporters/html'
import { markdownToDocxBuffer } from '../../lib/exporters/word'
import { basename } from '../../lib/pathUtils'

import 'prismjs/themes/prism.css'
import 'katex/dist/katex.min.css'

interface EditorProps {
  filePath: string
  initialContent: string
}

export function Editor({ filePath, initialContent }: EditorProps) {
  const { setIsDirty } = useAppStore()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSave = useCallback(
    (markdown: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      setIsDirty(true)
      saveTimerRef.current = setTimeout(async () => {
        await window.api.writeFile(filePath, markdown)
        setIsDirty(false)
      }, 1000)
    },
    [filePath, setIsDirty],
  )

  useEditor((root) =>
    MilkdownCoreEditor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, initialContent)
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          scheduleSave(markdown)
        })
      })
      .use(commonmark)
      .use(prism)
      .use(math)
      .use(listener),
  )

  const [, getInstance] = useInstance()

  useEffect(() => {
    const handleKeyboard = async (e: KeyboardEvent) => {
      if (!e.metaKey || !e.shiftKey) return

      if (e.key === 'H') {
        e.preventDefault()
        const markdown = getInstance()?.action(getMarkdown())
        if (!markdown) return
        const { unified } = await import('unified')
        const { default: remarkParse } = await import('remark-parse')
        const { default: remarkHtml } = await import('remark-html')
        const result = await unified().use(remarkParse).use(remarkHtml).process(markdown)
        const html = buildHTMLDocument(String(result), basename(filePath, '.md'))
        await window.api.exportHTML(filePath.replace(/\.md$/, '.html'), html)
      }

      if (e.key === 'P') {
        e.preventDefault()
        await window.api.exportPDF(filePath.replace(/\.md$/, '.pdf'))
      }

      if (e.key === 'W') {
        e.preventDefault()
        const markdown = getInstance()?.action(getMarkdown())
        if (!markdown) return
        const buffer = await markdownToDocxBuffer(markdown)
        await window.api.exportWord(filePath.replace(/\.md$/, '.docx'), buffer)
      }
    }

    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [filePath, getInstance])

  return (
    <div
      className="editor-wrapper"
      onPaste={(e) => handleImagePaste(e, filePath)}
      onDrop={(e) => handleImageDrop(e, filePath)}
      onDragOver={(e) => e.preventDefault()}
    >
      <Milkdown />
    </div>
  )
}
```

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: All tests pass (≥ 25 tests across 7 test files).

- [ ] **Step 4: Run dev and smoke-test the editor**

```bash
npm run dev
```

Checklist:
- [ ] Open a folder — file tree appears
- [ ] Click a `.md` file — content loads, WYSIWYG renders (headings, bold, lists)
- [ ] Type text — dirty dot `●` appears in status bar, disappears after ~1 second
- [ ] Type ` ```python ` + Enter — code block with syntax highlighting
- [ ] Type `$x^2$` — inline LaTeX renders as formula
- [ ] Paste image from clipboard — `![](./assets/image-xxx.png)` inserted
- [ ] `Cmd+Shift+H` — `.html` file created next to `.md`, open to verify
- [ ] `Cmd+Shift+P` — `.pdf` file created, open to verify
- [ ] `Cmd+Shift+W` — `.docx` file created, open in Word/Pages to verify
- [ ] 文件 menu → "打开文件夹" — opens folder dialog

- [ ] **Step 5: Commit**

```bash
git add src/components/Editor/
git commit -m "feat: implement Milkdown WYSIWYG editor with code, math, auto-save, and exports"
```

---

## Task 16: macOS Build Config

**Files:**
- Create: `electron-builder.config.ts`

- [ ] **Step 1: Create electron-builder.config.ts**

```typescript
import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.yourname.orca',
  productName: 'orca',
  mac: {
    category: 'public.app-category.productivity',
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
  },
  directories: {
    output: 'release',
  },
}

export default config
```

- [ ] **Step 2: Add package script**

In `package.json` add:
```json
"package": "npm run build && electron-builder --config electron-builder.config.ts"
```

- [ ] **Step 3: Verify build compiles**

```bash
npm run build
```

Expected: `dist/` and output directories created with no TypeScript or Vite errors.

- [ ] **Step 4: Commit**

```bash
git add electron-builder.config.ts package.json
git commit -m "chore: add macOS build configuration"
```

---

## Implementation Complete ✓

All MVP features covered by this plan:
- ✅ WYSIWYG Markdown editing (Milkdown + commonmark)
- ✅ Code block syntax highlighting (Prism.js)
- ✅ Fixed file tree sidebar (FileTree component)
- ✅ LaTeX math formulas (KaTeX via @milkdown/plugin-math)
- ✅ Image paste & drag (imageHandler → IPC → assets/)
- ✅ Export: HTML (Cmd+Shift+H), PDF (Cmd+Shift+P), Word (Cmd+Shift+W)
- ✅ Auto-save with dirty indicator (StatusBar)
- ✅ Native macOS menu with keyboard shortcuts
- ✅ macOS .dmg build config
