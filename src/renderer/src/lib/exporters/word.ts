import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

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
  const doc = new Document({
    sections: [{ children: lines.map(parseLine) }],
  })
  const buffer = await Packer.toBuffer(doc)
  return new Uint8Array(buffer)
}
