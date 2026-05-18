import { create } from 'zustand'
import type { FileNode } from '../../../types'

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
