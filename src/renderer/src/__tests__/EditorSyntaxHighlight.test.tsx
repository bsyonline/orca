import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { Editor } from '../components/Editor/Editor'

const useEditor = vi.fn()
const useCalls: unknown[] = []

vi.mock('@milkdown/kit/core', () => ({
  Editor: {
    make: () => ({
      config(callback: (ctx: unknown) => void) {
        callback({
          set: vi.fn(),
          get: vi.fn(() => ({ markdownUpdated: vi.fn() })),
        })
        return this
      },
      use(plugin: unknown) {
        useCalls.push(plugin)
        return this
      },
    }),
  },
  rootCtx: Symbol('rootCtx'),
  defaultValueCtx: Symbol('defaultValueCtx'),
  editorViewCtx: Symbol('editorViewCtx'),
}))

vi.mock('@milkdown/kit/preset/commonmark', () => ({
  commonmark: 'commonmark-plugin',
  toggleStrongCommand: { key: 'toggleStrong' },
  toggleEmphasisCommand: { key: 'toggleEmphasis' },
  toggleInlineCodeCommand: { key: 'toggleInlineCode' },
  wrapInHeadingCommand: { key: 'wrapInHeading' },
  turnIntoTextCommand: { key: 'turnIntoText' },
  wrapInBulletListCommand: { key: 'wrapInBulletList' },
  wrapInOrderedListCommand: { key: 'wrapInOrderedList' },
  wrapInBlockquoteCommand: { key: 'wrapInBlockquote' },
  createCodeBlockCommand: { key: 'createCodeBlock' },
  insertHrCommand: { key: 'insertHr' },
  sinkListItemCommand: { key: 'sinkListItem' },
  liftListItemCommand: { key: 'liftListItem' },
}))

vi.mock('@milkdown/kit/preset/gfm', () => ({
  gfm: 'gfm-plugin',
  insertTableCommand: { key: 'insertTable' },
  addRowAfterCommand: { key: 'addRowAfter' },
  addColAfterCommand: { key: 'addColAfter' },
  deleteSelectedCellsCommand: { key: 'deleteSelectedCells' },
  toggleStrikethroughCommand: { key: 'toggleStrikethrough' },
}))

vi.mock('@milkdown/kit/plugin/listener', () => ({
  listener: 'listener-plugin',
  listenerCtx: Symbol('listenerCtx'),
}))

vi.mock('@milkdown/kit/plugin/history', () => ({
  history: 'history-plugin',
}))

vi.mock('@milkdown/plugin-prism', () => ({
  prism: 'prism-plugin',
  prismConfig: { key: 'prismConfig' },
}))

vi.mock('@milkdown/react', () => ({
  Milkdown: () => <div data-testid="milkdown" />,
  useEditor: (factory: (root: HTMLElement) => unknown) => {
    useEditor(factory)
    return factory(document.createElement('div'))
  },
  useInstance: () => [null, () => undefined],
}))

vi.mock('@milkdown/kit/utils', () => ({
  getMarkdown: vi.fn(),
  callCommand: vi.fn(),
  insert: vi.fn(),
  replaceAll: vi.fn(),
}))

// Avoid loading the real mermaid plugin: its node schema ($nodeSchema) runs at
// import time and isn't part of the mocked @milkdown/kit/utils surface.
vi.mock('../plugins/mermaid', () => ({
  mermaidSchema: 'mermaid-schema',
  mermaidRemarkPlugin: 'mermaid-remark',
  mermaidProsePlugin: 'mermaid-prose',
}))

vi.mock('@milkdown/kit/prose/state', () => ({
  TextSelection: { create: vi.fn() },
}))

vi.mock('../lib/imageHandler', () => ({
  handleImagePaste: vi.fn(),
  handleImageDrop: vi.fn(),
}))

vi.mock('../lib/exporters/html', () => ({
  buildHTMLDocument: vi.fn(),
}))

vi.mock('../lib/exporters/word', () => ({
  markdownToDocxBuffer: vi.fn(),
}))

vi.mock('../components/Editor/TableDialog', () => ({
  TableDialog: () => null,
}))

vi.mock('../components/Editor/TableEdgeButtons', () => ({
  TableEdgeButtons: () => null,
}))

describe('Editor syntax highlighting', () => {
  beforeEach(() => {
    useEditor.mockClear()
    useCalls.length = 0
    Object.defineProperty(window, 'api', {
      value: {
        writeFile: vi.fn(),
        onMenuFormat: vi.fn(() => () => {}),
        onMenuParagraph: vi.fn(() => () => {}),
        onMenuSave: vi.fn(() => () => {}),
        onMenuToggleSourceMode: vi.fn(() => () => {}),
        onMenuCopyMarkdown: vi.fn(() => () => {}),
        onMenuPasteAsText: vi.fn(() => () => {}),
        onMenuInsertImage: vi.fn(() => () => {}),
        onMenuCopyAsText: vi.fn(() => () => {}),
        onMenuCopyAsHTML: vi.fn(() => () => {}),
        onMenuMoveLineUp: vi.fn(() => () => {}),
        onMenuMoveLineDown: vi.fn(() => () => {}),
        onMenuToggleFocusMode: vi.fn(() => () => {}),
        onMenuToggleTypingMode: vi.fn(() => () => {}),
        onMenuWordCount: vi.fn(() => () => {}),
        onMenuExportHTML: vi.fn(() => () => {}),
        onMenuExportPDF: vi.fn(() => () => {}),
        onMenuExportWord: vi.fn(() => () => {}),
        saveImage: vi.fn(),
        exportHTML: vi.fn(),
        exportPDF: vi.fn(),
        exportWord: vi.fn(),
      },
      writable: true,
      configurable: true,
    })
  })

  it('loads the prism plugin so fenced code blocks can receive token colors', () => {
    render(<Editor filePath="/notes/example.md" initialContent={'```ts\nconst x = 1\n```'} />)

    expect(useCalls).toContain('prism-plugin')
  })
})
