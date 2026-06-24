import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../store/useAppStore'

describe('useAppStore', () => {
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
})
