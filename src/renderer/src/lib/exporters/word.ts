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