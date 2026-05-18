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
