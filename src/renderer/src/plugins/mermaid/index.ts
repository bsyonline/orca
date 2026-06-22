import './mermaid.css'
import { $prose, $remark } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { visit } from 'unist-util-visit'
import { mermaidSchema } from './node'
import { mermaidView } from './view'

const mermaidRemarkPlugin = $remark('mermaid-parser', () => {
  return () => (tree: any) => {
    visit(tree, 'code', (node: any) => {
      if (node.lang === 'mermaid') {
        node.type = 'mermaid'
        node.value = node.value || ''
        delete node.lang
      }
    })
  }
})

const mermaidProsePlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('mermaid-view'),
    props: {
      nodeViews: {
        mermaid: mermaidView,
      },
    },
  })
})

export { mermaidSchema, mermaidRemarkPlugin, mermaidProsePlugin }