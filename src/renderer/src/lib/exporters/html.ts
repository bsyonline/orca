import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })

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

function escapeHTML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

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