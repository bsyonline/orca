import { create } from 'zustand'
import type { FileNode } from '../../../types'

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
  setActiveFileContent: (content: string) => void
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
  setActiveFileContent: (content) => set({ activeFileContent: content }),
  setFileTree: (tree) => set({ fileTree: tree }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
}))
