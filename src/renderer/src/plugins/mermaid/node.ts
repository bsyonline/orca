import { $nodeSchema } from '@milkdown/kit/utils'

export const mermaidSchema = $nodeSchema('mermaid', () => ({
  content: 'text*',
  group: 'block',
  code: true,
  isolating: true,
  defining: true,
  marks: '',
  attrs: {
    svg: { default: '' },
  },
  parseDOM: [
    {
      tag: 'pre[data-mermaid]',
      preserveWhitespace: 'full',
      getAttrs: (dom: HTMLElement) => ({
        svg: dom.getAttribute('data-svg') || '',
      }),
    },
  ],
  toDOM: (node) => [
    'pre',
    {
      'data-mermaid': 'true',
      'data-svg': node.attrs.svg,
      class: 'mermaid-block',
    },
    ['code', 0],
  ],
  parseMarkdown: {
    match: (node) => node.type === 'mermaid',
    runner: (state, node, type) => {
      state.openNode(type)
      if (node.value) {
        state.addText(node.value as string)
      }
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'mermaid',
    runner: (state, node) => {
      const text = node.textBetween(0, node.content.size)
      state.addNode('code', undefined, text, { lang: 'mermaid' })
    },
  },
}))