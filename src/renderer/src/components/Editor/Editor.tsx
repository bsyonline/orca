import './Editor.css'
import { useEffect, useCallback, useRef, useState } from 'react'
import { Editor as MilkdownCoreEditor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/kit/core'
import {
  commonmark,
  toggleStrongCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  wrapInHeadingCommand,
  turnIntoTextCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  wrapInBlockquoteCommand,
  createCodeBlockCommand,
  insertHrCommand,
  sinkListItemCommand,
  liftListItemCommand,
} from '@milkdown/kit/preset/commonmark'
import {
  gfm,
  insertTableCommand,
  addRowAfterCommand,
  addColAfterCommand,
  deleteSelectedCellsCommand,
  toggleStrikethroughCommand,
} from '@milkdown/kit/preset/gfm'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { history } from '@milkdown/kit/plugin/history'
import { prism, prismConfig } from '@milkdown/plugin-prism'
import { Milkdown, useEditor, useInstance } from '@milkdown/react'
import { getMarkdown, callCommand, insert, replaceAll } from '@milkdown/kit/utils'
import { TextSelection } from '@milkdown/kit/prose/state'
import { useAppStore } from '../../store/useAppStore'
import { handleImagePaste, handleImageDrop } from '../../lib/imageHandler'
import { buildHTMLDocument } from '../../lib/exporters/html'
import { markdownToDocxBuffer } from '../../lib/exporters/word'
import { basename } from '../../lib/pathUtils'
import { transformImagePath, restoreImagePath } from '../../lib/transformImagePath'
import { TableDialog } from './TableDialog'
import { TableEdgeButtons } from './TableEdgeButtons'
import { mermaidSchema, mermaidRemarkPlugin, mermaidProsePlugin } from '../../plugins/mermaid'

import '@milkdown/prose/view/style/prosemirror.css'

interface EditorProps {
  filePath: string
  initialContent: string
}

export function Editor({ filePath, initialContent }: EditorProps) {
  const { setIsDirty } = useAppStore()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>( null)
  const [sourceMode, setSourceMode] = useState(false)
  const [sourceContent, setSourceContent] = useState('')
  const [typingMode, setTypingMode] = useState(false)
  const [showTableDialog, setShowTableDialog] = useState(false)
  const transformedContent = transformImagePath(initialContent, filePath)
  const sourceMdRef = useRef(initialContent)
  const editorRef = useRef<HTMLDivElement>(null)

  const scheduleSave = useCallback(
    (markdown: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      setIsDirty(true)
      const restoredMarkdown = restoreImagePath(markdown, filePath)
      sourceMdRef.current = restoredMarkdown
      saveTimerRef.current = setTimeout(async () => {
        await window.api.writeFile(filePath, restoredMarkdown)
        setIsDirty(false)
      }, 1000)
    },
    [filePath, setIsDirty],
  )

  useEffect(() => {
    return () => {
      // Flush any pending debounced save before this editor unmounts. Switching
      // files within the 1s debounce window used to clearTimeout the pending
      // write, silently dropping the just-made edits. sourceMdRef holds the
      // latest restored markdown for this file.
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
        window.api.writeFile(filePath, sourceMdRef.current)
      }
    }
  }, [filePath])

  useEditor((root) =>
    MilkdownCoreEditor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, transformedContent)
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          const restoredMarkdown = restoreImagePath(markdown, filePath)
          sourceMdRef.current = restoredMarkdown
          scheduleSave(markdown)
        })
        ctx.set(prismConfig.key, {
          configureRefractor: (refractor) => {
            if (!refractor.registered('jsx')) refractor.alias('javascript', 'jsx')
            if (!refractor.registered('tsx')) refractor.alias('typescript', 'tsx')
          },
        })
      })
      .use(commonmark)
      .use(gfm)
      .use(prism)
      .use(history)
      .use(listener)
      .use(mermaidSchema)
      .use(mermaidRemarkPlugin)
      .use(mermaidProsePlugin),
  )

  const [, getInstance] = useInstance()

  const handleTableConfirm = useCallback(
    (rows: number, cols: number) => {
      const instance = getInstance()
      if (instance) {
        instance.action(callCommand(insertTableCommand.key, { row: rows, col: cols } as never))
      }
      setShowTableDialog(false)
    },
    [getInstance],
  )

  useEffect(() => {
    const exec = (cmd: Parameters<typeof callCommand>[0], payload?: unknown) =>
      getInstance()?.action(callCommand(cmd, payload as never))

    const cleanupFormat = window.api.onMenuFormat((type) => {
      switch (type) {
        case 'bold':          exec(toggleStrongCommand.key); break
        case 'italic':        exec(toggleEmphasisCommand.key); break
        case 'code':          exec(toggleInlineCodeCommand.key); break
        case 'mathInline':    getInstance()?.action(insert('$formula$')); break
        case 'strikethrough': exec(toggleStrikethroughCommand.key); break
        case 'link':    getInstance()?.action(insert('[](https://)')); break
        case 'comment': getInstance()?.action(insert('<!-- comment -->')); break
        case 'clearFormat':
          getInstance()?.action((ctx) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const view = ctx.get(editorViewCtx) as any
            const { state, dispatch } = view
            const { from, to, empty } = state.selection
            if (empty) return
            let tr = state.tr
            Object.values(state.schema.marks as Record<string, unknown>).forEach((markType) => {
              tr = tr.removeMark(from, to, markType)
            })
            dispatch(tr)
          })
          break
      }
    })

    const cleanupParagraph = window.api.onMenuParagraph((type) => {
      if (type.startsWith('h') && type.length === 2) {
        exec(wrapInHeadingCommand.key, parseInt(type[1]))
        return
      }
      switch (type) {
        case 'paragraph':    exec(turnIntoTextCommand.key); break
        case 'bullet':       exec(wrapInBulletListCommand.key); break
        case 'ordered':      exec(wrapInOrderedListCommand.key); break
        case 'taskList':     getInstance()?.action(insert('- [ ] ')); break
        case 'quote':        exec(wrapInBlockquoteCommand.key); break
        case 'codeBlock':    exec(createCodeBlockCommand.key); break
        case 'mathBlock':    getInstance()?.action(insert('$$\nformula\n$$')); break
        case 'hr':           exec(insertHrCommand.key); break
        case 'table':        setShowTableDialog(true); break
        case 'tableAddRow':  exec(addRowAfterCommand.key); break
        case 'tableAddCol':  exec(addColAfterCommand.key); break
        case 'tableDelCells': exec(deleteSelectedCellsCommand.key); break
        case 'indent':       exec(sinkListItemCommand.key); break
        case 'outdent':      exec(liftListItemCommand.key); break
        case 'linkRef':      getInstance()?.action(insert('[link text][ref]\n\n[ref]: https://example.com\n')); break
        case 'footnote':     getInstance()?.action(insert('[^1]\n\n[^1]: Footnote text.\n')); break
        case 'toc':          getInstance()?.action(insert('[TOC]\n')); break
        case 'yamlFrontMatter': {
          const current = getInstance()?.action(getMarkdown()) ?? ''
          if (!current.startsWith('---')) {
            getInstance()?.action(replaceAll('---\ntitle: Untitled\n---\n\n' + current))
          }
          break
        }
        case 'heading-up':
        case 'heading-down':
          getInstance()?.action((ctx) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const view = ctx.get(editorViewCtx) as any
            const { state, dispatch } = view
            const { $from } = state.selection
            for (let d = $from.depth; d >= 0; d--) {
              const node = $from.node(d)
              if (node.type.name === 'heading') {
                const newLevel = node.attrs.level + (type === 'heading-up' ? -1 : 1)
                if (newLevel < 1) {
                  dispatch(state.tr.setNodeMarkup($from.before(d), state.schema.nodes.paragraph, {}))
                } else if (newLevel <= 6) {
                  dispatch(state.tr.setNodeMarkup($from.before(d), node.type, { ...node.attrs, level: newLevel }))
                }
                break
              }
            }
          })
          break
        case 'insertAbove':
        case 'insertBelow':
          getInstance()?.action((ctx) => {
            const view = ctx.get(editorViewCtx) as any
            const { state, dispatch } = view
            const { $from } = state.selection
            let targetDepth = 1
            for (let d = $from.depth; d >= 1; d--) {
              const node = $from.node(d)
              if (node.type.name === 'table' || node.type.name === 'code_block') {
                targetDepth = d
                break
              }
            }
            const pos = type === 'insertAbove' ? $from.before(targetDepth) : $from.after(targetDepth)
            const paragraph = state.schema.nodes.paragraph.create()
            const tr = state.tr.insert(pos, paragraph)
            tr.setSelection(TextSelection.create(tr.doc, pos + 1))
            dispatch(tr)
          })
          break
      }
    })

    const cleanupSave = window.api.onMenuSave(async () => {
      const markdown = getInstance()?.action(getMarkdown())
      if (markdown !== undefined) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        const restoredMarkdown = restoreImagePath(markdown, filePath)
        await window.api.writeFile(filePath, restoredMarkdown)
        setIsDirty(false)
      }
    })

    return () => { cleanupFormat(); cleanupParagraph(); cleanupSave() }
  }, [filePath, getInstance, setIsDirty])

  useEffect(() => {
    const cleanup = window.api.onMenuToggleSourceMode(() => {
      setSourceMode((prev) => {
        if (!prev) {
          const md = getInstance()?.action(getMarkdown()) ?? sourceMdRef.current
          sourceMdRef.current = md
          setSourceContent(md)
          return true
        } else {
          getInstance()?.action(replaceAll(sourceMdRef.current))
          return false
        }
      })
    })
    return cleanup
  }, [getInstance])

  useEffect(() => {
    const cleanupCopy = window.api.onMenuCopyMarkdown(() => {
      const md = getInstance()?.action(getMarkdown())
      if (md) navigator.clipboard.writeText(md)
    })

    const cleanupPaste = window.api.onMenuPasteAsText(async () => {
      const text = await navigator.clipboard.readText()
      if (text) getInstance()?.action(insert(text))
    })

    const moveLine = (direction: 'up' | 'down') => {
      getInstance()?.action((ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const view = ctx.get(editorViewCtx) as any
        const { state, dispatch } = view
        const { $from } = state.selection
        if ($from.depth < 1) return

        const curPos = $from.before(1)
        const curNode = state.doc.nodeAt(curPos)
        if (!curNode) return
        const curEnd = curPos + curNode.nodeSize

        if (direction === 'up' && curPos > 1) {
          const $prev = state.doc.resolve(curPos - 1)
          const prevPos = $prev.before($prev.depth)
          const prevNode = state.doc.nodeAt(prevPos)
          if (!prevNode) return
          const tr = state.tr.replaceWith(prevPos, curEnd, [curNode, prevNode])
          dispatch(tr.setSelection(TextSelection.create(tr.doc, prevPos + 1)))
        } else if (direction === 'down' && curEnd < state.doc.content.size) {
          const nextNode = state.doc.nodeAt(curEnd)
          if (!nextNode) return
          const tr = state.tr.replaceWith(curPos, curEnd + nextNode.nodeSize, [nextNode, curNode])
          dispatch(tr.setSelection(TextSelection.create(tr.doc, curPos + nextNode.nodeSize + 1)))
        }
      })
    }

    const cleanupMoveUp = window.api.onMenuMoveLineUp(() => moveLine('up'))
    const cleanupMoveDown = window.api.onMenuMoveLineDown(() => moveLine('down'))

    const cleanupCopyAsText = window.api.onMenuCopyAsText(() => {
      const md = getInstance()?.action(getMarkdown())
      if (!md) return
      const plain = md
        .replace(/```[\s\S]*?```/gm, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/_(.+?)_/g, '$1')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/!\[.*?\]\(.+?\)/g, '')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .replace(/^[-*+]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        .replace(/^>\s+/gm, '')
        .replace(/^-{3,}$/gm, '')
        .trim()
      navigator.clipboard.writeText(plain)
    })

    const cleanupCopyAsHTML = window.api.onMenuCopyAsHTML(async () => {
      const md = getInstance()?.action(getMarkdown())
      if (!md) return
      const { unified } = await import('unified')
      const { default: remarkParse } = await import('remark-parse')
      const { default: remarkHtml } = await import('remark-html')
      const result = await unified().use(remarkParse).use(remarkHtml).process(md)
      navigator.clipboard.writeText(String(result))
    })

    const cleanupInsertImage = window.api.onMenuInsertImage(async () => {
      const imagePath = await window.api.insertLocalImage()
      if (!imagePath) return
      getInstance()?.action(insert(`![](${imagePath})\n`))
    })

    const cleanupWordCount = window.api.onMenuWordCount(async () => {
      const md = getInstance()?.action(getMarkdown()) ?? ''
      const textOnly = md.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '')
      const words = textOnly.trim() ? textOnly.trim().split(/\s+/).filter((w) => w.length > 0).length : 0
      await window.api.showWordCount(words, md.length, md.replace(/\s/g, '').length)
    })

    return () => {
      cleanupCopy(); cleanupPaste(); cleanupMoveUp(); cleanupMoveDown()
      cleanupCopyAsText(); cleanupCopyAsHTML(); cleanupInsertImage(); cleanupWordCount()
    }
  }, [getInstance])

  useEffect(() => {
    const cleanup = window.api.onMenuToggleTypingMode(() => setTypingMode((v) => !v))
    return cleanup
  }, [])

  useEffect(() => {
    if (!typingMode) return
    const scroll = () => {
      const sel = window.getSelection()
      if (!sel?.rangeCount) return
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const wrapper = document.querySelector('.editor-wrapper') as HTMLElement
      if (!wrapper) return
      const wrapperRect = wrapper.getBoundingClientRect()
      const target = wrapper.scrollTop + rect.top - wrapperRect.top - wrapperRect.height / 2
      wrapper.scrollTo({ top: target, behavior: 'smooth' })
    }
    document.addEventListener('selectionchange', scroll)
    return () => document.removeEventListener('selectionchange', scroll)
  }, [typingMode])

useEffect(() => {
    const exportHTML = async () => {
      const markdown = getInstance()?.action(getMarkdown())
      if (!markdown) return
      const restoredMarkdown = restoreImagePath(markdown, filePath)
      const html = await buildHTMLDocument(restoredMarkdown, basename(filePath, '.md'))
      await window.api.exportHTML(filePath.replace(/\.md$/, '.html'), html)
    }

    const exportPDF = async () => {
      await window.api.exportPDF(filePath.replace(/\.md$/, '.pdf'))
    }

    const exportWord = async () => {
      const markdown = getInstance()?.action(getMarkdown())
      if (!markdown) return
      const restoredMarkdown = restoreImagePath(markdown, filePath)
      const buffer = await markdownToDocxBuffer(restoredMarkdown)
      await window.api.exportWord(filePath.replace(/\.md$/, '.docx'), buffer)
    }

    const cleanupHTML = window.api.onMenuExportHTML(exportHTML)
    const cleanupPDF = window.api.onMenuExportPDF(exportPDF)
    const cleanupWord = window.api.onMenuExportWord(exportWord)

    return () => {
      cleanupHTML()
      cleanupPDF()
      cleanupWord()
    }
  }, [filePath, getInstance])

  return (
    <div
      className="editor-wrapper"
      ref={editorRef}
      onPaste={(e) => !sourceMode && handleImagePaste(e, filePath)}
      onDrop={(e) => !sourceMode && handleImageDrop(e, filePath)}
      onDragOver={(e) => e.preventDefault()}
      onClick={(e) => {
        if (sourceMode) return
        const instance = getInstance()
        if (!instance) return

        instance.action((ctx) => {
          const view = ctx.get(editorViewCtx)
          if (!view) return

          const wrapper = editorRef.current
          if (!wrapper) return

          const proseMirrorEl = wrapper.querySelector('.ProseMirror') as HTMLElement
          if (!proseMirrorEl) return

          const clickY = e.clientY
          const proseMirrorRect = proseMirrorEl.getBoundingClientRect()

          if (clickY > proseMirrorRect.bottom) {
            const { state, dispatch } = view
            const docSize = state.doc.content.size
            const lastNode = state.doc.lastChild

            if (!lastNode || (lastNode.type.name === 'paragraph' && lastNode.content.size === 0)) {
              const pos = docSize - 1
              dispatch(state.tr.setSelection(TextSelection.create(state.doc, pos)))
              view.focus()
            } else {
              const paragraph = state.schema.nodes.paragraph.create()
              const tr = state.tr.insert(docSize, paragraph)
              dispatch(tr.setSelection(TextSelection.create(tr.doc, docSize + 1)))
              view.focus()
            }
          }
        })
      }}
    >
      <div style={{ display: sourceMode ? 'none' : undefined }}>
        <Milkdown />
        {!sourceMode && <TableEdgeButtons editorRef={editorRef} getInstance={getInstance} />}
        {showTableDialog && (
          <TableDialog
            onConfirm={handleTableConfirm}
            onCancel={() => setShowTableDialog(false)}
            defaultRows={3}
            defaultCols={3}
          />
        )}
      </div>
      {sourceMode && (
        <textarea
          className="source-view"
          value={sourceContent}
          onChange={(e) => {
            sourceMdRef.current = e.target.value
            setSourceContent(e.target.value)
            scheduleSave(e.target.value)
          }}
          spellCheck={false}
        />
      )}
    </div>
  )
}
