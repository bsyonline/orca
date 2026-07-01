import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, createEvent, fireEvent, waitFor } from '@testing-library/react'
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
    rendererReady: vi.fn(),
    onMenuOpenFolder: noop,
    onOpenFile: noop,
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
    useAppStore.setState({ workspaceRoot: null, fileTree: [], activeFile: null, isDirty: false })
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

  it('opens file sent by the main process', async () => {
    const readFile = vi.fn().mockResolvedValue('# from finder')
    let openFileCallback: ((filePath: string) => void) | undefined
    Object.defineProperty(window, 'api', {
      value: makeApi({
        readFile,
        onOpenFile: (callback: (filePath: string) => void) => {
          openFileCallback = callback
          return () => {}
        },
      }),
      writable: true,
      configurable: true,
    })

    render(<App />)

    await act(async () => {
      openFileCallback?.('/docs/from-finder.markdown')
    })

    expect(readFile).toHaveBeenCalledWith('/docs/from-finder.markdown')
    expect(useAppStore.getState().activeFile).toBe('/docs/from-finder.markdown')
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

  it('shows unsaved status for a dirty active document', () => {
    useAppStore.setState({
      activeFile: '/docs/note.md',
      activeFileContent: '# test',
      isDirty: true,
      openDocs: ['/docs/note.md'],
    })

    render(<App />)

    expect(document.querySelector('.document-title')).toHaveTextContent('note.md--已编辑')
    expect(document.querySelector('.statusbar')).toBeNull()
  })

  it('shows only the document name in the titlebar when saved', () => {
    useAppStore.setState({
      activeFile: '/docs/note.md',
      activeFileContent: '# test',
      isDirty: false,
      openDocs: ['/docs/note.md'],
    })

    render(<App />)

    expect(document.querySelector('.document-title')).toHaveTextContent('note.md')
  })

  it('shows word count in the top right when hovering the document title', () => {
    useAppStore.setState({
      activeFile: '/docs/note.md',
      activeFileContent: 'hello world\n中文',
      isDirty: false,
      openDocs: ['/docs/note.md'],
    })

    render(<App />)

    expect(document.querySelector('.titlebar-word-count')).toHaveTextContent('字数 4')
  })

  it('marks window close as cancellable when active document is dirty', () => {
    useAppStore.setState({
      activeFile: '/docs/note.md',
      activeFileContent: '# test',
      isDirty: true,
      openDocs: ['/docs/note.md'],
    })

    render(<App />)

    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })
})

describe('App sidebar width adjustment', () => {
  beforeEach(() => {
    useAppStore.setState({ 
      workspaceRoot: '/test', 
      fileTree: [], 
      activeFile: null,
      activeFileContent: '',
      openDocs: []
    })
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1000,
    })
    Object.defineProperty(window, 'api', {
      value: makeApi(),
      writable: true,
      configurable: true,
    })
  })

  it('renders SidebarResizer when sidebar is visible', () => {
    render(<App />)

    const resizer = document.querySelector('.sidebar-resizer')
    expect(resizer).toBeInTheDocument()
  })

  it('does not render SidebarResizer when sidebar is hidden', async () => {
    const toggleSidebarMock = vi.fn()
    Object.defineProperty(window, 'api', {
      value: makeApi({
        onMenuToggleSidebar: (callback: () => void) => {
          toggleSidebarMock.mockImplementation(callback)
          return () => {}
        },
      }),
      writable: true,
      configurable: true,
    })

    const { rerender } = render(<App />)

    await act(async () => {
      toggleSidebarMock()
    })

    rerender(<App />)

    const resizer = document.querySelector('.sidebar-resizer')
    expect(resizer).not.toBeInTheDocument()
  })

  it('adjusts width on window resize', async () => {
    useAppStore.setState({ 
      activeFile: '/test.md',
      activeFileContent: '# Test',
      openDocs: ['/test.md']
    })

    render(<App />)

    const resizer = document.querySelector('.sidebar-resizer')
    
    await act(async () => {
      fireEvent.mouseDown(resizer!, { clientX: 240, preventDefault: vi.fn() })
    })

    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 500 })
    })

    await act(async () => {
      window.innerWidth = 600
      fireEvent(window, new Event('resize'))
    })

    await waitFor(() => {
      const sidebar = document.querySelector('.sidebar') as HTMLElement | null
      const width = sidebar?.style.getPropertyValue('--sidebar-width')
      expect(parseInt(width || '240')).toBeLessThanOrEqual(300)
    })
  })
})
