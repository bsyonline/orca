import type { NodeViewConstructor } from '@milkdown/kit/prose/view'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })

let idCounter = 0
function generateId(): string {
  return `mermaid-${++idCounter}-${Date.now()}`
}

export const mermaidView: NodeViewConstructor = (node, view, getPos) => {
  const dom = document.createElement('div')
  dom.className = 'mermaid-wrapper'
  
  let editing = false
  let svgContent = node.attrs.svg || ''
  let currentNode = node

  function getSrc(): string {
    if (currentNode.content.size === 0) return ''
    return currentNode.textBetween(0, currentNode.content.size)
  }

  async function renderSvg(src: string): Promise<string> {
    if (!src.trim()) {
      return '<div class="mermaid-empty">Click to edit diagram</div>'
    }
    try {
      const { svg } = await mermaid.render(generateId(), src)
      return svg
    } catch {
      return `<div class="mermaid-error"><p>Syntax error</p><pre>${src}</pre></div>`
    }
  }

  function updateDom(): void {
    if (editing) {
      dom.innerHTML = ''
      const textarea = document.createElement('textarea')
      textarea.className = 'mermaid-editor'
      textarea.value = getSrc()
      textarea.spellcheck = false
      dom.appendChild(textarea)
      textarea.focus()
      textarea.addEventListener('blur', commitEdit)
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          commitEdit()
        }
      })
    } else {
      dom.innerHTML = svgContent
    }
  }

  async function commitEdit(): Promise<void> {
    const textarea = dom.querySelector('textarea')
    const newSrc = textarea?.value || ''
    editing = false
    
    const pos = getPos()
    if (pos === undefined) return

    const svg = await renderSvg(newSrc)
    svgContent = svg
    
    const tr = view.state.tr.setNodeMarkup(pos, undefined, { svg }, undefined)
    const from = pos + 1
    const to = pos + currentNode.nodeSize - 1
    if (newSrc) {
      tr.replaceWith(from, to, view.state.schema.text(newSrc))
    } else {
      tr.delete(from, to)
    }
    view.dispatch(tr)
    
    updateDom()
  }

  dom.addEventListener('click', (e) => {
    if (e.target === dom || e.target === dom.querySelector('.mermaid-empty')) {
      editing = true
      updateDom()
    }
  })

  const src = getSrc()
  if (svgContent === '' && src.trim()) {
    renderSvg(src).then((svg) => {
      svgContent = svg
      updateDom()
    })
  } else {
    updateDom()
  }

  return {
    dom,
    update: (newNode) => {
      currentNode = newNode
      svgContent = newNode.attrs.svg || ''
      if (!editing) updateDom()
      return true
    },
    destroy: () => {
      dom.remove()
    },
  }
}