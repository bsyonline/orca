import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, screen } from '@testing-library/react'
import App from '../App'
import { useAppStore } from '../store/useAppStore'

// Track every MilkdownProvider mount/unmount so we can assert that switching
// documents tears the old provider down and mounts a brand new one (rather than
// reusing a single long-lived provider whose shared editor state races on swap).
const providerMounts: string[] = []
let providerInstances = 0

vi.mock('@milkdown/react', () => ({
  MilkdownProvider: ({ children }: { children: React.ReactNode }) => {
    // A fresh closure id per mount; if React reuses the same provider instance
    // across a file switch this id would not change.
    providerInstances += 1
    return <div data-provider-id={providerInstances}>{children}</div>
  },
}))
vi.mock('../components/Editor/Editor', () => ({
  Editor: ({ filePath }: { filePath: string }) => {
    providerMounts.push(filePath)
    return <div data-testid="editor">{filePath}</div>
  },
}))
vi.mock('../components/FileTree/FileTree', () => ({
  FileTree: () => <div data-testid="file-tree" />,
}))

const noop = () => () => {}

function makeApi(overrides: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    readFile: vi.fn(async (p: string) => `# content of ${p}`),
    openFolder: vi.fn(),
    listDir: vi.fn(async () => []),
    rendererReady: vi.fn(),
  }
  for (const k of [
    'onMenuOpenFolder', 'onOpenFile', 'onMenuNewFile', 'onMenuRenameFile', 'onMenuDeleteFile',
    'onMenuDuplicateFile', 'onMenuMoveFile', 'onMenuRevealInFinder', 'onMenuExportHTML',
    'onMenuExportPDF', 'onMenuExportWord', 'onMenuSave', 'onMenuFormat', 'onMenuParagraph',
    'onMenuInsertImage', 'onMenuCopyMarkdown', 'onMenuCopyAsText', 'onMenuCopyAsHTML',
    'onMenuPasteAsText', 'onMenuMoveLineUp', 'onMenuMoveLineDown', 'onMenuToggleSidebar',
    'onMenuToggleSourceMode', 'onMenuToggleFocusMode', 'onMenuToggleTypingMode', 'onMenuWordCount',
  ]) base[k] = noop
  return { ...base, ...overrides }
}

describe('open document via File -> Open menu', () => {
  beforeEach(() => {
    providerMounts.length = 0
    providerInstances = 0
    useAppStore.setState({ workspaceRoot: null, fileTree: [], activeFile: null, activeFileContent: '', isDirty: false, openDocs: [] })
    vi.restoreAllMocks()
  })

  it('switches A -> B and gives each document its own Milkdown provider', async () => {
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

    render(<App />)

    await act(async () => {
      openFolderHandler?.()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(useAppStore.getState().activeFile).toBe('/docs/A.md')
    const idAfterA = document.querySelector('[data-provider-id]')?.getAttribute('data-provider-id')

    await act(async () => {
      openFolderHandler?.()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(useAppStore.getState().activeFile, 'activeFile did not switch to B').toBe('/docs/B.md')

    const editor = document.querySelector('[data-testid="editor"]')!
    expect(editor.textContent, 'editor still shows the old file').toBe('/docs/B.md')

    // The provider for B must be a different instance than the one for A — proving
    // the editor subtree was fully remounted (no shared, raceable editor state).
    const idAfterB = document.querySelector('[data-provider-id]')?.getAttribute('data-provider-id')
    expect(idAfterB, 'provider was reused across the file switch').not.toBe(idAfterA)
    expect(providerMounts).toEqual(['/docs/A.md', '/docs/B.md'])
  })

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

  it('focus mode toggles the open-docs tree visibility at 2+ docs', async () => {
    let openFolderHandler: (() => void) | undefined
    let focusModeHandler: (() => void) | undefined
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
        onMenuToggleFocusMode: (cb: () => void) => {
          focusModeHandler = cb
          return () => {}
        },
      }),
      writable: true,
      configurable: true,
    })

    const { container } = render(<App />)

    await act(async () => {
      openFolderHandler?.()
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => {
      openFolderHandler?.()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(container.querySelector('.open-docs-tree')).not.toBeNull()

    // Focus mode hides the open-docs tree even with 2+ docs open.
    await act(async () => {
      focusModeHandler?.()
    })
    expect(container.querySelector('.open-docs-tree')).toBeNull()

    // Toggling again shows it.
    await act(async () => {
      focusModeHandler?.()
    })
    expect(container.querySelector('.open-docs-tree')).not.toBeNull()
  })

  it('closing a background doc leaves the active doc unchanged (3 docs)', async () => {
    let openFolderHandler: (() => void) | undefined
    const openFolder = vi
      .fn()
      .mockResolvedValueOnce('/docs/A.md')
      .mockResolvedValueOnce('/docs/B.md')
      .mockResolvedValueOnce('/docs/C.md')

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

    render(<App />)

    // Open A, B, C in order; C ends up active.
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        openFolderHandler?.()
        await Promise.resolve()
        await Promise.resolve()
      })
    }
    expect(useAppStore.getState().openDocs).toEqual(['/docs/A.md', '/docs/B.md', '/docs/C.md'])

    // Switch active to A, then close background doc C — active must stay A.
    // (closeDoc('C') returns the neighbor B; a naive `next !== activeFile` guard
    // would wrongly switch active to B even though A was the active doc.)
    await act(async () => {
      screen.getByText('A.md').click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(useAppStore.getState().activeFile).toBe('/docs/A.md')

    await act(async () => {
      screen.getByLabelText('关闭 C.md').click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(useAppStore.getState().openDocs).toEqual(['/docs/A.md', '/docs/B.md'])
    expect(useAppStore.getState().activeFile, 'closing a background doc must not switch active').toBe('/docs/A.md')
  })

  it('asks before closing the dirty active doc and keeps it open when cancelled', async () => {
    Object.defineProperty(window, 'api', {
      value: makeApi(),
      writable: true,
      configurable: true,
    })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    useAppStore.setState({
      activeFile: '/docs/A.md',
      activeFileContent: '# A edited',
      isDirty: true,
      openDocs: ['/docs/A.md', '/docs/B.md'],
    })

    render(<App />)

    await act(async () => {
      screen.getByLabelText('关闭 A.md').click()
      await Promise.resolve()
    })

    expect(window.confirm).toHaveBeenCalled()
    expect(useAppStore.getState().openDocs).toEqual(['/docs/A.md', '/docs/B.md'])
    expect(useAppStore.getState().activeFile).toBe('/docs/A.md')
  })
})
