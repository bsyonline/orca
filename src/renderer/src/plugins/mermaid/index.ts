import './mermaid.css'
import { $prose, $remark, $serializer } from '@milkdown/kit/utils'
import { schemaCtx } from '@milkdown/kit/core'
import { Plugin, PluginKey } from '@milkdown/kit/prose'
import { visit } from 'unist-util-visit'
import { mermaidSchema } from './node'
import { mermaidView } from './view'

const mermaidRemarkPlugin = $remark('mermaid-parser', () => {
  return () => (tree: any) => {
    visit(tree, 'code', (node: any) => {
      if (node.lang === 'mermaid') {
        node.type = 'mermaid'
        node.lang = undefined
      }
    })
  }
})

const mermaidSerializer = $serializer('mermaid', (state, node) => {
  const src = node.textBetween(0, node.content.size)
  state.write('```mermaid\n')
  state.text(src, false)
  state.ensureNewLine()
  state.write('```')
  state.closeBlock(node)
})

export const mermaidPlugin = () => [
  mermaidSchema,
  mermaidRemarkPlugin,
  mermaidSerializer,
  $prose((ctx) => {
    const schema = ctx.get(schemaCtx)
    const mermaidNodeType = schema.nodes.mermaid
    if (!mermaidNodeType) return null
    
    return new Plugin({
      key: new PluginKey('mermaid-view'),
      props: {
        nodeViews: {
          mermaid: (node, view, getPos) => mermaidView(node, view, getPos),
        },
      },
    })
  }),
]