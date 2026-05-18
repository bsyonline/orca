import './Editor.css'
import { useEffect, useCallback, useRef } from 'react'
import { Editor as MilkdownCoreEditor, rootCtx, defaultValueCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { math } from '@milkdown/plugin-math'
import { Milkdown, useEditor, useInstance } from '@milkdown/react'
import { getMarkdown } from '@milkdown/kit/utils'
import { useAppStore } from '../../store/useAppStore'
import { handleImagePaste, handleImageDrop } from '../../lib/imageHandler'
import { buildHTMLDocument } from '../../lib/exporters/html'
import { markdownToDocxBuffer } from '../../lib/exporters/word'
import { basename } from '../../lib/pathUtils'

import 'katex/dist/katex.min.css'

interface EditorProps {
  filePath: string
  initialContent: string
}

export function Editor({ filePath, initialContent }: EditorProps) {
  const { setIsDirty } = useAppStore()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSave = useCallback(
    (markdown: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      setIsDirty(true)
      saveTimerRef.current = setTimeout(async () => {
        await window.api.writeFile(filePath, markdown)
        setIsDirty(false)
      }, 1000)
    },
    [filePath, setIsDirty],
  )

  useEditor((root) =>
    MilkdownCoreEditor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, initialContent)
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          scheduleSave(markdown)
        })
      })
      .use(commonmark)
      .use(math)
      .use(listener),
  )

  const [, getInstance] = useInstance()

  useEffect(() => {
    const exportHTML = async () => {
      const markdown = getInstance()?.action(getMarkdown())
      if (!markdown) return
      const { unified } = await import('unified')
      const { default: remarkParse } = await import('remark-parse')
      const { default: remarkHtml } = await import('remark-html')
      const result = await unified().use(remarkParse).use(remarkHtml).process(markdown)
      const html = buildHTMLDocument(String(result), basename(filePath, '.md'))
      await window.api.exportHTML(filePath.replace(/\.md$/, '.html'), html)
    }

    const exportPDF = async () => {
      await window.api.exportPDF(filePath.replace(/\.md$/, '.pdf'))
    }

    const exportWord = async () => {
      const markdown = getInstance()?.action(getMarkdown())
      if (!markdown) return
      const buffer = await markdownToDocxBuffer(markdown)
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
      onPaste={(e) => handleImagePaste(e, filePath)}
      onDrop={(e) => handleImageDrop(e, filePath)}
      onDragOver={(e) => e.preventDefault()}
    >
      <Milkdown />
    </div>
  )
}
