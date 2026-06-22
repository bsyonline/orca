# Mermaid Diagrams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Mermaid diagram rendering in the markdown editor using Milkdown custom node.

**Architecture:** Create a custom Milkdown plugin with NodeSchema and NodeView to render ` ```mermaid ` code blocks as SVG diagrams. Click to toggle edit mode. Update exporters for HTML/PDF/Word.

**Tech Stack:** Milkdown 7.x, ProseMirror, mermaid.js, React, TypeScript

---

## Task 1: Add Mermaid Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add mermaid package**

```bash
npm install mermaid
```

- [ ] **Step 2: Verify installation**

```bash
npm list mermaid
```
Expected: `mermaid@<version>`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add mermaid dependency"
```

---

## Task 2: Create Mermaid Plugin Directory

**Files:**
- Create: `src/renderer/src/plugins/mermaid/index.ts`
- Create: `src/renderer/src/plugins/mermaid/node.ts`
- Create: `src/renderer/src/plugins/mermaid/view.tsx`
- Create: `src/renderer/src/plugins/mermaid/mermaid.css`

- [ ] **Step 1: Create plugin directory structure**

```bash
mkdir -p src/renderer/src/plugins/mermaid
touch src/renderer/src/plugins/mermaid/index.ts
touch src/renderer/src/plugins/mermaid/node.ts
touch src/renderer/src/plugins/mermaid/view.tsx
touch src/renderer/src/plugins/mermaid/mermaid.css
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/plugins/mermaid/
git commit -m "chore: create mermaid plugin directory"
```

---

## Task 3: Define Mermaid Node Schema

**Files:**
- Create: `src/renderer/src/plugins/mermaid/node.ts`

- [ ] **Step 1: Write node schema definition**

```typescript
// src/renderer/src/plugins/mermaid/node.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/plugins/mermaid/node.ts
git commit -m "feat: define mermaid node schema"
```

---

## Task 4: Create Mermaid NodeView

**Files:**
- Create: `src/renderer/src/plugins/mermaid/view.tsx`

- [ ] **Step 1: Write NodeView component**

```typescript
// src/renderer/src/plugins/mermaid/view.tsx
import { NodeViewConstructor } from '@milkdown/kit/prose'
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

  function getSrc(): string {
    if (node.content.size === 0) return ''
    return node.textBetween(0, node.content.size)
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
      textarea.spellCheck = false
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
    
    const tr = view.state.tr
      .setNodeMarkup(pos, undefined, { svg }, undefined)
    const newText = view.state.schema.text(newSrc)
    tr.replaceWith(pos + 1, pos + node.nodeSize - 1, newText)
    view.dispatch(tr)
    
    updateDom()
  }

  dom.addEventListener('click', (e) => {
    if (e.target === dom || e.target === dom.querySelector('.mermaid-empty')) {
      editing = true
      updateDom()
    }
  })

  // Initial render
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
      node = newNode
      svgContent = newNode.attrs.svg || ''
      if (!editing) updateDom()
      return true
    },
    destroy: () => {
      dom.remove()
    },
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/plugins/mermaid/view.tsx
git commit -m "feat: create mermaid NodeView with edit toggle"
```

---

## Task 5: Add Mermaid Styles

**Files:**
- Create: `src/renderer/src/plugins/mermaid/mermaid.css`

- [ ] **Step 1: Write CSS styles**

```css
/* src/renderer/src/plugins/mermaid/mermaid.css */
.mermaid-wrapper {
  margin: 14px 0;
  text-align: center;
  border: 1px solid var(--border-sub);
  border-radius: 10px;
  padding: 16px;
  background: var(--bg-subtle);
  cursor: pointer;
  min-height: 60px;
}

.mermaid-wrapper svg {
  max-width: 100%;
  display: inline-block;
}

.mermaid-editor {
  width: 100%;
  min-height: 200px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  border: 1px solid var(--border-def);
  border-radius: 8px;
  background: var(--bg-code);
  color: var(--ink);
  padding: 14px;
  outline: none;
  resize: vertical;
}

.mermaid-empty {
  color: var(--ink-3);
  font-size: 14px;
  user-select: none;
}

.mermaid-error {
  color: var(--error);
  border: 1px solid var(--error);
  padding: 12px;
  border-radius: 8px;
  background: var(--bg-subtle);
}

.mermaid-error p {
  margin: 0 0 8px 0;
  font-weight: 600;
}

.mermaid-error pre {
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 12px;
  margin: 0;
  white-space: pre-wrap;
  color: var(--ink-2);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/plugins/mermaid/mermaid.css
git commit -m "feat: add mermaid diagram styles"
```

---

## Task 6: Create Plugin Entry Point

**Files:**
- Create: `src/renderer/src/plugins/mermaid/index.ts`

- [ ] **Step 1: Write plugin entry**

```typescript
// src/renderer/src/plugins/mermaid/index.ts
import './mermaid.css'
import { $prose } from '@milkdown/kit/utils'
import { schemaCtx } from '@milkdown/kit/core'
import { mermaidSchema } from './node'
import { mermaidView } from './view'

export const mermaidPlugin = () => [
  mermaidSchema,
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
```

Note: Need to import Plugin and PluginKey from ProseMirror.

- [ ] **Step 2: Fix imports**

```typescript
// src/renderer/src/plugins/mermaid/index.ts
import './mermaid.css'
import { $prose } from '@milkdown/kit/utils'
import { schemaCtx } from '@milkdown/kit/core'
import { Plugin, PluginKey } from '@milkdown/kit/prose'
import { mermaidSchema } from './node'
import { mermaidView } from './view'

export const mermaidPlugin = () => [
  mermaidSchema,
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
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/plugins/mermaid/index.ts
git commit -m "feat: create mermaid plugin entry point"
```

---

## Task 7: Integrate Plugin into Editor

**Files:**
- Modify: `src/renderer/src/components/Editor/Editor.tsx:79-94`

- [ ] **Step 1: Import and use mermaid plugin**

Add import at top of Editor.tsx:

```typescript
import { mermaidPlugin } from '../../plugins/mermaid'
```

Add `.use(mermaidPlugin())` after `.use(listener)` in the editor config:

```typescript
// Editor.tsx line ~93
.use(commonmark)
.use(gfm)
.use(history)
.use(listener)
.use(mermaidPlugin())
```

- [ ] **Step 2: Verify editor still works**

```bash
npm run dev
```

Open the app, verify it loads without errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/Editor/Editor.tsx
git commit -m "feat: integrate mermaid plugin into editor"
```

---

## Task 8: Add Parser Rule for Mermaid Code Blocks

**Files:**
- Modify: `src/renderer/src/plugins/mermaid/index.ts`

- [ ] **Step 1: Add parser rule**

Need to intercept fenced code blocks with `mermaid` language. Milkdown uses remark for parsing, so we need a custom remark plugin or modify the parser.

```typescript
// src/renderer/src/plugins/mermaid/index.ts
import './mermaid.css'
import { $prose, $remark } from '@milkdown/kit/utils'
import { schemaCtx } from '@milkdown/kit/core'
import { Plugin, PluginKey } from '@milkdown/kit/prose'
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

export const mermaidPlugin = () => [
  mermaidSchema,
  mermaidRemarkPlugin,
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
```

Need to import `visit` from unist-util-visit:

```bash
npm install unist-util-visit
```

- [ ] **Step 2: Add unist-util-visit dependency**

```bash
npm install unist-util-visit
```

- [ ] **Step 3: Update imports**

```typescript
import { visit } from 'unist-util-visit'
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/renderer/src/plugins/mermaid/index.ts
git commit -m "feat: add parser rule for mermaid code blocks"
```

---

## Task 9: Add Serializer for Mermaid Node

**Files:**
- Modify: `src/renderer/src/plugins/mermaid/index.ts`

- [ ] **Step 1: Add serializer**

Milkdown needs a handler to serialize mermaid nodes back to markdown:

```typescript
// Add to mermaidPlugin
import { $serializer } from '@milkdown/kit/utils'

const mermaidSerializer = $serializer('mermaid', (state, node) => {
  const src = node.textBetween(0, node.content.size)
  state.write('```mermaid\n')
  state.text(src, false)
  state.ensureNewLine()
  state.write('```')
  state.closeBlock(node)
})
```

Update the plugin export:

```typescript
export const mermaidPlugin = () => [
  mermaidSchema,
  mermaidRemarkPlugin,
  mermaidSerializer,
  $prose((ctx) => {
    // ... same as before
  }),
]
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/plugins/mermaid/index.ts
git commit -m "feat: add serializer for mermaid node"
```

---

## Task 10: Update HTML Exporter

**Files:**
- Modify: `src/renderer/src/lib/exporters/html.ts`

- [ ] **Step 1: Handle mermaid in HTML export**

The current HTML exporter uses remark-parse + remark-html. We need to add mermaid handling.

Approach: Pre-process markdown to convert ` ```mermaid ` to rendered SVG before passing to remark.

```typescript
// src/renderer/src/lib/exporters/html.ts
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })

async function renderMermaidBlocks(markdown: string): Promise<string> {
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g
  const matches = [...markdown.matchAll(mermaidRegex)]
  
  if (matches.length === 0) return markdown
  
  let result = markdown
  for (const match of matches) {
    const src = match[1]
    try {
      const { svg } = await mermaid.render(`export-mermaid-${Date.now()}`, src)
      result = result.replace(match[0], `<div class="mermaid-diagram">${svg}</div>`)
    } catch {
      result = result.replace(match[0], `<pre class="mermaid-error"><code>${src}</code></pre>`)
    }
  }
  return result
}

export async function buildHTMLDocument(markdown: string, title: string): Promise<string> {
  const processedMarkdown = await renderMermaidBlocks(markdown)
  const { unified } = await import('unified')
  const { default: remarkParse } = await import('remark-parse')
  const { default: remarkHtml } = await import('remark-html')
  const result = await unified().use(remarkParse).use(remarkHtml).process(processedMarkdown)
  const bodyHTML = String(result)
  
  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
${bodyHTML}
</body>
</html>`
}
```

Add mermaid CSS to PRINT_CSS:

```typescript
const PRINT_CSS = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 24px; line-height: 1.75; color: #1a1a1a; }
  h1 { font-size: 2em; margin: 1em 0 0.5em; }
  h2 { font-size: 1.5em; margin: 1em 0 0.4em; }
  h3 { font-size: 1.25em; margin: 0.8em 0 0.3em; }
  p { margin: 0.6em 0; }
  code { background: #f0f0f0; border-radius: 3px; padding: 2px 5px; font-family: monospace; font-size: 0.88em; }
  pre { background: #f6f8fa; border: 1px solid #e8e8e8; border-radius: 6px; padding: 16px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 4px solid #ddd; padding-left: 16px; color: #666; margin: 1em 0; }
  img { max-width: 100%; }
  a { color: #2563eb; text-decoration: none; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; }
  th { background: #f5f5f5; font-weight: 600; }
  ul, ol { padding-left: 1.5em; }
  .mermaid-diagram { margin: 1em 0; text-align: center; }
  .mermaid-diagram svg { max-width: 100%; }
  .mermaid-error { background: #fff0f0; padding: 1em; border-radius: 6px; }
`
```

- [ ] **Step 2: Update export call in Editor.tsx**

The exportHTML function in Editor.tsx needs to call the new async version:

```typescript
// Editor.tsx around line 361-370
const exportHTML = async () => {
  const markdown = getInstance()?.action(getMarkdown())
  if (!markdown) return
  const restoredMarkdown = restoreImagePath(markdown, filePath)
  const html = await buildHTMLDocument(restoredMarkdown, basename(filePath, '.md'))
  await window.api.exportHTML(filePath.replace(/\.md$/, '.html'), html)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/lib/exporters/html.ts src/renderer/src/components/Editor/Editor.tsx
git commit -m "feat: add mermaid support in HTML export"
```

---

## Task 11: Update Word Exporter

**Files:**
- Modify: `src/renderer/src/lib/exporters/word.ts`

- [ ] **Step 1: Add SVG to PNG conversion**

```typescript
// src/renderer/src/lib/exporters/word.ts
import mermaid from 'mermaid'
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } from 'docx'

mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })

async function svgToPngBuffer(svgString: string): Promise<Uint8Array> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return new Uint8Array(0)
  
  const img = new Image()
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)))
  
  await new Promise<void>((resolve) => {
    img.onload = () => resolve()
    img.onerror = () => resolve()
  })
  
  if (!img.width || !img.height) return new Uint8Array(0)
  
  canvas.width = img.width
  canvas.height = img.height
  ctx.drawImage(img, 0, 0)
  
  const dataUrl = canvas.toDataURL('image/png')
  const base64 = dataUrl.split(',')[1]
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}

async function renderMermaidToImage(src: string): Promise<ImageRun | null> {
  try {
    const { svg } = await mermaid.render(`word-mermaid-${Date.now()}`, src)
    const pngBuffer = await svgToPngBuffer(svg)
    if (pngBuffer.length === 0) return null
    return new ImageRun({
      data: pngBuffer,
      transformation: { width: 600, height: 400 },
      type: 'png',
    })
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Update markdown parsing to handle mermaid blocks**

```typescript
function parseLine(line: string): Paragraph {
  if (line.startsWith('# ')) {
    return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(line.slice(2))] })
  }
  if (line.startsWith('## ')) {
    return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(line.slice(3))] })
  }
  if (line.startsWith('### ')) {
    return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(line.slice(4))] })
  }
  if (line.startsWith('> ')) {
    return new Paragraph({ indent: { left: 720 }, children: [new TextRun({ text: line.slice(2), italics: true })] })
  }
  if (line === '') {
    return new Paragraph('')
  }
  const inlineText = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1')
  return new Paragraph({ children: [new TextRun(inlineText)] })
}

export async function markdownToDocxBuffer(markdown: string): Promise<Uint8Array> {
  const lines = markdown.split('\n')
  const children: (Paragraph | ImageRun)[] = []
  
  let inMermaidBlock = false
  let mermaidSrc = ''
  
  for (const line of lines) {
    if (line === '```mermaid') {
      inMermaidBlock = true
      mermaidSrc = ''
      continue
    }
    if (inMermaidBlock && line === '```') {
      inMermaidBlock = false
      const image = await renderMermaidToImage(mermaidSrc)
      if (image) {
        children.push(new Paragraph({ children: [image] }))
      } else {
        children.push(new Paragraph({
          children: [new TextRun({ text: mermaidSrc, italics: true })]
        }))
      }
      continue
    }
    if (inMermaidBlock) {
      mermaidSrc += line + '\n'
      continue
    }
    
    children.push(parseLine(line))
  }
  
  const doc = new Document({
    sections: [{ children }],
  })
  const buffer = await Packer.toBuffer(doc)
  return new Uint8Array(buffer)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/lib/exporters/word.ts
git commit -m "feat: add mermaid support in Word export"
```

---

## Task 12: Add Unit Tests

**Files:**
- Create: `src/renderer/src/__tests__/mermaid.test.ts`

- [ ] **Step 1: Write schema tests**

```typescript
// src/renderer/src/__tests__/mermaid.test.ts
import { describe, it, expect } from 'vitest'
import { mermaidSchema } from '../plugins/mermaid/node'

describe('mermaidSchema', () => {
  it('defines mermaid node type', () => {
    expect(mermaidSchema.node).toBeDefined()
  })
  
  it('has text content', () => {
    const spec = mermaidSchema.node?.spec
    expect(spec?.content).toBe('text*')
  })
  
  it('is block group', () => {
    const spec = mermaidSchema.node?.spec
    expect(spec?.group).toBe('block')
  })
  
  it('has svg attr', () => {
    const spec = mermaidSchema.node?.spec
    expect(spec?.attrs?.svg).toBeDefined()
    expect(spec?.attrs?.svg.default).toBe('')
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npm test
```
Expected: Tests pass

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/__tests__/mermaid.test.ts
git commit -m "test: add mermaid schema unit tests"
```

---

## Task 13: Run Type Check

**Files:**
- None (verification only)

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```
Expected: No errors

- [ ] **Step 2: Fix any type errors if present**

If errors found, fix them and re-run typecheck.

---

## Task 14: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add mermaid to features list**

```markdown
## Features

- File tree and workspace browsing
- WYSIWYG Markdown editing with live source sync
- Tables, math, code blocks, and lists
- **Mermaid diagrams (sequence, flowchart, class, etc.)**
- Drag-and-drop opening for local `.md` files
- Export to HTML, PDF, and Word
- Local image path handling for project-relative assets
```

- [ ] **Step 2: Add usage example**

```markdown
## Mermaid Diagrams

Write diagrams using `mermaid` code blocks:

\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello
    Bob->>Alice: Hi!
\`\`\`

Click the rendered diagram to edit the source code.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add mermaid diagram support to README"
```

---

## Task 15: Final Integration Test

**Files:**
- None (manual verification)

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test mermaid rendering**

Create a test markdown file with:

```markdown
# Mermaid Test

```mermaid
sequenceDiagram
    Alice->>Bob: Hello
    Bob-->>Alice: Hi!
\`\`\`

```mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action]
    B -->|No| D[End]
\`\`\`
```

Verify:
- Diagrams render as SVG
- Clicking toggles edit mode
- Edit and blur re-renders
- Source mode shows mermaid code

- [ ] **Step 3: Test exports**

- Export to HTML: verify SVG embedded
- Export to PDF: verify diagrams visible
- Export to Word: verify diagrams as images

---

## Summary

Implementation adds:
- Custom Milkdown node + NodeView for mermaid diagrams
- Parser/Serializer for ` ```mermaid ` code blocks
- Export support for HTML, PDF, Word
- Unit tests
- Documentation

All changes follow existing code patterns and integrate cleanly with Milkdown architecture.