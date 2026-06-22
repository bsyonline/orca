# Mermaid Diagrams Rendering Design

## Overview

Add support for Mermaid diagrams (sequence, flowchart, class, state, etc.) in Orca markdown editor. Diagrams are written using ` ```mermaid ` code blocks and rendered directly as SVG charts in WYSIWYG mode.

## Requirements

- Support common Mermaid diagram types: sequence, flowchart, class, state, gantt, pie, etc.
- Use ` ```mermaid ` code block syntax
- WYSIWYG rendering: show rendered SVG directly in editor
- Click to edit source code, blur/Escape to exit and re-render
- Export correctly to HTML, PDF, Word

## Architecture

### File Structure

```
src/renderer/src/plugins/mermaid/
  index.ts          # Plugin entry point
  node.ts           # Schema node definition
  view.tsx          # NodeView component
  mermaid.css       # Styles
```

### Components

1. **MermaidNode**: Custom ProseMirror schema node storing mermaid source and rendered SVG cache
2. **MermaidView**: NodeView implementing SVG rendering and edit mode toggle
3. **Export adapters**: Handle mermaid nodes in HTML/PDF/Word exports

## MermaidNode Schema

```typescript
// node.ts
import { $nodeSchema } from '@milkdown/kit/utils'

export const mermaidNode = $nodeSchema('mermaid', {
  content: 'text*',
  marks: '',
  group: 'block',
  code: true,
  isolating: true,
  defining: true,
  attrs: {
    svg: { default: '' },      // rendered SVG (cache)
  },
  toDOM: (node) => ['div', { 'data-mermaid-svg': node.attrs.svg }, ['pre', 0]],
  parseDOM: [{
    tag: 'div[data-mermaid-svg]',
    getAttrs: (dom) => ({ svg: dom.getAttribute('data-mermaid-svg') || '' }),
    contentElement: 'pre'
  }]
})
```

## MermaidView (NodeView)

```typescript
// view.tsx
import { NodeView } from '@milkdown/kit/prose'
import mermaid from 'mermaid'

export class MermaidView implements NodeView {
  dom: HTMLElement
  contentDOM: HTMLElement  // for text content (source code)
  editing = false
  renderedSvg: string = ''
  private idCounter = 0
  
  constructor(node, view, getPos) {
    this.dom = document.createElement('div')
    this.contentDOM = document.createElement('pre')
    this.contentDOM.style.display = 'none'
    this.dom.appendChild(this.contentDOM)
    this.dom.className = 'mermaid-block'
    this.dom.addEventListener('click', () => this.toggleEdit())
    this.renderSvg(node.textBetween(0, node.content.size))
  }
  
  generateId(): string {
    return 'mermaid-' + (++this.idCounter) + '-' + Date.now()
  }
  
  async renderSvg(src: string) {
    if (!src.trim()) {
      this.dom.innerHTML = '<div class="mermaid-empty">Click to edit diagram</div>'
      return
    }
    try {
      const { svg } = await mermaid.render(this.generateId(), src)
      this.renderedSvg = svg
      this.updateDom()
    } catch (e) {
      this.showError(src, e.message)
    }
  }
  
  toggleEdit() {
    this.editing = !this.editing
    this.updateDom()
  }
  
  updateDom() {
    if (this.editing) {
      this.dom.innerHTML = ''
      const textarea = document.createElement('textarea')
      textarea.className = 'mermaid-editor'
      textarea.value = this.node.textBetween(0, this.node.content.size)
      this.dom.appendChild(textarea)
      textarea.focus()
      textarea.addEventListener('blur', () => this.commitEdit())
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.commitEdit()
      })
    } else {
      this.dom.innerHTML = this.renderedSvg
    }
  }
  
  commitEdit() {
    const textarea = this.dom.querySelector('textarea')
    const newSrc = textarea?.value || ''
    // Update node content via transaction
    const pos = this.getPos()
    if (pos !== undefined) {
      const tr = this.view.state.tr.setNodeMarkup(pos, null, {}, [
        this.view.state.schema.text(newSrc)
      ])
      this.view.dispatch(tr)
    }
    this.editing = false
    this.renderSvg(newSrc)
  }
  
  showError(src: string, errorMsg: string) {
    this.dom.innerHTML = `<div class="mermaid-error">
      <p>Diagram syntax error: ${errorMsg}</p>
      <pre>${src}</pre>
    </div>`
  }
}
```

## Markdown Parsing & Serialization

### Parsing

Intercept ` ```mermaid ` code blocks and convert to mermaidNode instead of code_block.

Approach: Modify the parser config to add special handling for mermaid language tag:

```typescript
// In plugin setup
.use(mermaidPlugin) // custom plugin that adds parser rules
```

The parser rule matches fenced code blocks with language `mermaid` and creates mermaidNode.

### Serialization

Convert mermaidNode back to ` ```mermaid ` format:

```typescript
toMarkdown: (state, node) => {
  const src = node.textBetween(0, node.content.size)
  state.write('```mermaid\n')
  state.text(src, false)
  state.ensureNewLine()
  state.write('```')
  state.closeBlock(node)
}
```

## Export Handling

### HTML Export

- Detect mermaid nodes in the document
- Render to SVG using mermaid.js
- Embed SVG directly in HTML output
- Include necessary mermaid CSS styles in the exported HTML

### PDF Export

- SVG is already rendered in the editor DOM
- Electron's print functionality handles SVG natively
- No special processing needed

### Word Export

Convert SVG to PNG image and embed in docx:

1. Render mermaid diagram to SVG string
2. Create a canvas element, draw SVG to canvas
3. Export canvas as PNG ArrayBuffer
4. Create docx ImageRun with PNG data

Implementation approach:
- Use `sharp` (Node.js) or browser canvas API
- For Electron renderer process, use HTML canvas + `canvas.toDataURL('image/png')`
- Convert data URL to ArrayBuffer for docx

```typescript
// In word.ts
async function svgToPng(svgString: string): Promise<Uint8Array> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const img = new Image()
  img.src = 'data:image/svg+xml;base64,' + btoa(svgString)
  await new Promise(resolve => img.onload = resolve)
  canvas.width = img.width
  canvas.height = img.height
  ctx.drawImage(img, 0, 0)
  const dataUrl = canvas.toDataURL('image/png')
  const base64 = dataUrl.split(',')[1]
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}
```

## Error Handling

- Mermaid syntax errors: show error message + source code
- Rendering failures: gracefully degrade to showing source
- Never block user editing due to render errors

```typescript
try {
  const svg = await mermaid.render(id, src)
} catch (e) {
  this.showError(src)
}
```

## Styling

```css
/* mermaid.css */
.mermaid-block {
  margin: 14px 0;
  text-align: center;
  border: 1px solid var(--border-sub);
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
  background: var(--bg-subtle);
}

.mermaid-block svg {
  max-width: 100%;
  display: inline-block;
}

.mermaid-editor {
  width: 100%;
  min-height: 200px;
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  border: none;
  outline: none;
  background: var(--bg-code);
  color: var(--ink);
  padding: 14px;
  border-radius: 8px;
}

.mermaid-error {
  color: var(--error);
  border: 1px solid var(--error);
  padding: 12px;
  border-radius: 8px;
}

.mermaid-error pre {
  font-family: monospace;
  font-size: 13px;
  margin-top: 8px;
}

.mermaid-empty {
  padding: 40px 20px;
  color: var(--ink-3);
  font-size: 14px;
  user-select: none;
}

/* CSS variables used (defined in global styles):
   --border-sub, --bg-subtle, --bg-code, --ink, --ink-3, --error
*/
```

## Testing Strategy

### Unit Tests

- Schema node creation and attribute handling
- SVG rendering correctness with valid mermaid source
- Edit mode toggle logic
- Error handling for invalid syntax

### Integration Tests

- Markdown parsing: ` ```mermaid ` → mermaidNode
- Markdown serialization: mermaidNode → ` ```mermaid `
- Editor rendering: type diagram source, verify SVG appears

### Export Tests

- HTML export contains correct embedded SVG
- PDF print shows diagram correctly
- Word export handles diagrams appropriately

## Dependencies

Add to package.json:
- `mermaid` - diagram rendering library

## Implementation Steps

1. Add mermaid package dependency
2. Create mermaid plugin files (node.ts, view.tsx, index.ts, mermaid.css)
3. Integrate plugin into Editor.tsx
4. Update HTML exporter to handle mermaid nodes
5. Update Word exporter to handle mermaid diagrams
6. Add unit and integration tests
7. Update README to document mermaid support

## User Interaction Flow

```
User types ```mermaid → creates mermaidNode → shows empty editor
User types diagram code → onBlur → renders SVG
User clicks SVG → toggles edit mode → shows textarea
User edits code → onBlur/Escape → re-renders SVG
```