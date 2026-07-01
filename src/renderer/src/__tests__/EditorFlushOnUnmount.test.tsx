import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { Editor } from '../components/Editor/Editor'
import { useAppStore } from '../store/useAppStore'

// Capture the markdownUpdated listener the editor registers so the test can
// simulate the user typing.
let markdownListener: ((ctx: unknown, markdown: string) => void) | undefined

vi.mock('@milkdown/kit/core', () => ({
  Editor: {
    make: () => {
      const instance = {
        config(callback: (ctx: unknown) => void) {
          callback({
            set: vi.fn(),
            get: () => ({
              markdownUpdated: (fn: (ctx: unknown, markdown: string) => void) => {
                markdownListener = fn
              },
            }),
          })
          return instance
        },
        use() {
          return instance
        },
      }
      return instance
    },
  },
  rootCtx: Symbol('rootCtx'),
  defaultValueCtx: Symbol('defaultValueCtx'),
  editorViewCtx: Symbol('editorViewCtx'),
}))

vi.mock('@milkdown/react', () => ({
  Milkdown: () => <div data-testid="milkdown" />,
  useEditor: (factory: (root: HTMLElement) => unknown) => {
    factory(document.createElement('div'))
    return { loading: false, get: () => undefined }
  },
  useInstance: () => [null, () => undefined],
}))

// Avoid loading the real mermaid plugin (its node schema runs at import time).
vi.mock('../plugins/mermaid', () => ({
  mermaidSchema: 'mermaid-schema',
  mermaidRemarkPlugin: 'mermaid-remark',
  mermaidProsePlugin: 'mermaid-prose',
}))

vi.mock('@milkdown/kit/preset/commonmark', () => ({
  commonmark: 'commonmark',
  toggleStrongCommand: { key: 'a' }, toggleEmphasisCommand: { key: 'a' },
  toggleInlineCodeCommand: { key: 'a' }, wrapInHeadingCommand: { key: 'a' },
  turnIntoTextCommand: { key: 'a' }, wrapInBulletListCommand: { key: 'a' },
  wrapInOrderedListCommand: { key: 'a' }, wrapInBlockquoteCommand: { key: 'a' },
  createCodeBlockCommand: { key: 'a' }, insertHrCommand: { key: 'a' },
  sinkListItemCommand: { key: 'a' }, liftListItemCommand: { key: 'a' },
}))
vi.mock('@milkdown/kit/preset/gfm', () => ({
  gfm: 'gfm', insertTableCommand: { key: 'a' }, addRowAfterCommand: { key: 'a' },
  addColAfterCommand: { key: 'a' }, deleteSelectedCellsCommand: { key: 'a' },
  toggleStrikethroughCommand: { key: 'a' },
}))
vi.mock('@milkdown/kit/plugin/listener', () => ({ listener: 'listener', listenerCtx: Symbol('listenerCtx') }))
vi.mock('@milkdown/kit/plugin/history', () => ({ history: 'history' }))
vi.mock('@milkdown/plugin-prism', () => ({ prism: 'prism', prismConfig: { key: 'prismConfig' } }))
vi.mock('@milkdown/kit/utils', () => ({
  getMarkdown: vi.fn(), callCommand: vi.fn(), insert: vi.fn(), replaceAll: vi.fn(),
  $prose: vi.fn((plugin) => plugin),
}))
vi.mock('@milkdown/kit/prose/state', () => ({ TextSelection: { create: vi.fn() } }))
vi.mock('../lib/imageHandler', () => ({ handleImagePaste: vi.fn(), handleImageDrop: vi.fn() }))
vi.mock('../lib/exporters/html', () => ({ buildHTMLDocument: vi.fn() }))
vi.mock('../lib/exporters/word', () => ({ markdownToDocxBuffer: vi.fn() }))
vi.mock('../components/Editor/TableDialog', () => ({ TableDialog: () => null }))
vi.mock('../components/Editor/TableEdgeButtons', () => ({ TableEdgeButtons: () => null }))

const onMenu = () => vi.fn(() => () => {})

describe('Editor flushes pending edits on unmount', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    markdownListener = undefined
    useAppStore.setState({ activeFile: '/docs/A.md', activeFileContent: '# A', isDirty: false })
    Object.defineProperty(window, 'api', {
      value: new Proxy(
        { writeFile: vi.fn() },
        {
          get(target: Record<string, unknown>, prop: string) {
            if (prop in target) return target[prop]
            // any onMenu* accessor returns a registrar that yields a cleanup fn
            return onMenu()
          },
        },
      ),
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('writes the latest content when switched away before the debounce fires', () => {
    const { unmount } = render(<Editor filePath="/docs/A.md" initialContent="# A" />)

    // User edits A; the save is debounced (1s) and has NOT fired yet.
    expect(markdownListener).toBeTypeOf('function')
    act(() => {
      markdownListener!({}, '# A edited')
    })

    // Switch files before 1s elapses -> the editor unmounts.
    act(() => {
      unmount()
    })

    const writeFile = (window.api.writeFile as ReturnType<typeof vi.fn>)
    expect(writeFile).toHaveBeenCalledWith('/docs/A.md', '# A edited')
  })

  it('syncs latest markdown into app state while editing', () => {
    render(<Editor filePath="/docs/A.md" initialContent="# A" />)

    expect(markdownListener).toBeTypeOf('function')
    act(() => {
      markdownListener!({}, '# A edited')
    })

    expect(useAppStore.getState().activeFileContent).toBe('# A edited')
  })
})
