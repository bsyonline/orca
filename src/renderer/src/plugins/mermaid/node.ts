import { $nodeSchema } from '@milkdown/kit/utils'

export const mermaidSchema = $nodeSchema('mermaid', {
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
})