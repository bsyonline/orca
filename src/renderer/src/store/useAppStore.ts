import { create } from 'zustand'
import type { FileNode } from '../../../types'

interface AppState {
  workspaceRoot: string | null
  activeFile: string | null
  activeFileContent: string
  fileTree: FileNode[]
  isDirty: boolean
  setWorkspaceRoot: (root: string | null) => void
  openFile: (path: string, content: string) => void
  setActiveFile: (path: string | null) => void
  setFileTree: (tree: FileNode[]) => void
  setIsDirty: (dirty: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  workspaceRoot: null,
  activeFile: null,
  activeFileContent: '',
  fileTree: [],
  isDirty: false,
  setWorkspaceRoot: (root) => set({ workspaceRoot: root }),
  openFile: (path, content) => set({ activeFile: path, activeFileContent: content, isDirty: false }),
  setActiveFile: (path) => set({ activeFile: path, isDirty: false }),
  setFileTree: (tree) => set({ fileTree: tree }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
}))
