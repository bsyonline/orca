import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { Editor } from '../components/Editor/Editor'

// Track what the auto-focus effect does to the editor view.
let mockFocusCallCount = 0
let mockAtEndCalled = false
let mockSetSelectionArg: unknown = null
let mockScrollIntoViewCalled = false
let mockHasFocus = false
let mockDocSize = 5
// Simulate Milkdown's racy lifecycle where ctx.get(editorViewCtx) THROWS
// because the view isn't injected yet. The effect must swallow this, not crash.
let mockThrowOnGet = false

vi.mock('@milkdown/kit/core', () => ({
  Editor: {
    make: () => {
      const instance = {
        config(callback: (ctx: unknown) => void) {
          callback({ set: vi.fn(), get: () => ({ markdownUpdated: vi.fn() }) })
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
  // loading=false so the auto-focus effect runs synchronously after mount.
  useInstance: () => [
    false,
    () => ({
      action: (callback: (ctx: unknown) => void) => {
        callback({
          get: () => {
            if (mockThrowOnGet) throw new Error('Context "nodes" not found')
            return {
            hasFocus: () => mockHasFocus,
            focus: () => {
              mockFocusCallCount++
            },
            state: {
              doc: { content: { size: mockDocSize } },
              tr: {
                setSelection: (sel: unknown) => {
                  mockSetSelectionArg = sel
                  return {
                    scrollIntoView: () => {
                      mockScrollIntoViewCalled = true
                      return {}
                    },
                  }
                },
              },
            },
            dispatch: vi.fn(),
            }
          },
        })
      },
    }),
  ],
}))

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
}))
vi.mock('@milkdown/kit/prose/state', () => ({
  TextSelection: { create: vi.fn() },
  Selection: {
    atEnd: vi.fn((doc: unknown) => {
      mockAtEndCalled = true
      return { __atEnd: true, doc }
    }),
    atStart: vi.fn(() => ({ __atStart: true })),
  },
}))
vi.mock('../lib/imageHandler', () => ({ handleImagePaste: vi.fn(), handleImageDrop: vi.fn() }))
vi.mock('../lib/exporters/html', () => ({ buildHTMLDocument: vi.fn() }))
vi.mock('../lib/exporters/word', () => ({ markdownToDocxBuffer: vi.fn() }))
vi.mock('../components/Editor/TableDialog', () => ({ TableDialog: () => null }))
vi.mock('../components/Editor/TableEdgeButtons', () => ({ TableEdgeButtons: () => null }))

const onMenu = () => vi.fn(() => () => {})

describe('Editor auto-focus and cursor positioning', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFocusCallCount = 0
    mockAtEndCalled = false
    mockSetSelectionArg = null
    mockScrollIntoViewCalled = false
    mockHasFocus = false
    mockDocSize = 5
    mockThrowOnGet = false
    Object.defineProperty(window, 'api', {
      value: new Proxy(
        { writeFile: vi.fn() },
        {
          get(target: Record<string, unknown>, prop: string) {
            if (prop in target) return target[prop]
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

  it('focuses the editor when mounted so the user can type immediately', () => {
    act(() => {
      render(<Editor filePath="/docs/test.md" initialContent="# Test" />)
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(mockFocusCallCount).toBeGreaterThan(0)
  })

  it('places the caret at the END of the document (Selection.atEnd)', () => {
    act(() => {
      render(<Editor filePath="/docs/test.md" initialContent="# Test content" />)
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(mockAtEndCalled, 'should position caret via Selection.atEnd').toBe(true)
    expect(mockSetSelectionArg, 'the end selection should be applied').toMatchObject({ __atEnd: true })
  })

  it('does NOT scroll to the caret — long docs stay at the top for reading', () => {
    act(() => {
      render(<Editor filePath="/docs/long.md" initialContent={'para\n\n'.repeat(500)} />)
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(mockScrollIntoViewCalled, 'must not scrollIntoView on open').toBe(false)
  })

  it('does NOT crash the component when ctx.get throws (racy lifecycle)', () => {
    mockThrowOnGet = true
    expect(() => {
      act(() => {
        render(<Editor filePath="/docs/test.md" initialContent="# Test" />)
      })
      act(() => {
        // Drives all retry attempts; each throw must be swallowed, never thrown.
        vi.advanceTimersByTime(1000)
      })
    }).not.toThrow()
    // It tried but never succeeded in focusing — and crucially did not crash.
    expect(mockFocusCallCount).toBe(0)
  })

  it('does not steal focus if the editor is already focused', () => {
    mockHasFocus = true
    act(() => {
      render(<Editor filePath="/docs/test.md" initialContent="# Test" />)
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(mockFocusCallCount).toBe(0)
    expect(mockAtEndCalled).toBe(false)
  })
})
