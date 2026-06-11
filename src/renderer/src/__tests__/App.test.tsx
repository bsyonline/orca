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
