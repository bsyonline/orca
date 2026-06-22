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
  content: 'text',
  marks: '',
  group: 'block',
  code: true,
  isolating: true,
  attrs: {
    src: { default: '' },      // mermaid source code
    svg: { default: '' },      // rendered SVG (cache)
  },
  toDOM: (node) => ['div', { 'data-mermaid': node.attrs.src }, 0],
  parseDOM: [{
    tag: 'div[data-mermaid]',
    getAttrs: (dom) => ({ src: dom.getAttribute('data-mermaid') || '' })
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
  editing = false
  renderedSvg: string = ''
  
  constructor(node, view, getPos) {
    this.dom = document.createElement('div')
    this.dom.className = 'mermaid-block'
    this.dom.addEventListener('click', () => this.toggleEdit())
    this.renderSvg(node.attrs.src)
  }
  
  async renderSvg(src: string) {
    try {
      const svg = await mermaid.render('mermaid-' + generateId(), src)
      this.renderedSvg = svg
      this.updateDom()
    } catch (e) {
      this.showError(src)
    }
  }
  
  toggleEdit() {
    this.editing = !this.editing
    this.updateDom()
  }
  
  updateDom() {
    if (this.editing) {
      this.dom.innerHTML = `<textarea class="mermaid-editor">${this.node.attrs.src}</textarea>`
      const textarea = this.dom.querySelector('textarea')
      textarea?.addEventListener('blur', () => this.commitEdit())
      textarea?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.commitEdit()
      })
    } else {
      this.dom.innerHTML = this.renderedSvg
    }
  }
  
  commitEdit() {
    const textarea = this.dom.querySelector('textarea')
    const newSrc = textarea?.value || ''
    // Update node attrs and re-render
    this.renderSvg(newSrc)
    this.editing = false
    this.updateDom()
  }
  
  showError(src: string) {
    this.dom.innerHTML = `<div class="mermaid-error">
      <p>Diagram syntax error</p>
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
  state.write('```mermaid\n')
  state.text(node.attrs.src, false)
  state.write('\n```')
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

Two options:
1. Render SVG, convert to PNG image, embed in docx
2. Keep as code block (simpler, but not ideal)

Recommendation: Option 1 for better visual output. Use a canvas/SVG-to-image conversion.

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