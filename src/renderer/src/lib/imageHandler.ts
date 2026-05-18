import { dirname } from './pathUtils'

export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(',')[1]
}

export function getImageExt(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
  }
  return map[mimeType] ?? mimeType.split('/')[1] ?? 'png'
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.readAsDataURL(file)
  })
}

async function saveImageFile(dataUrl: string, mimeType: string, filePath: string): Promise<string | null> {
  try {
    const base64 = dataUrlToBase64(dataUrl)
    const ext = getImageExt(mimeType)
    const destDir = dirname(filePath)
    return await window.api.saveImage(destDir, base64, ext)
  } catch {
    return null
  }
}

export async function handleImagePaste(e: React.ClipboardEvent, filePath: string): Promise<void> {
  const items = Array.from(e.clipboardData.items)
  for (const item of items) {
    if (!item.type.startsWith('image/')) continue
    e.preventDefault()
    const file = item.getAsFile()
    if (!file) continue
    const dataUrl = await readFileAsDataUrl(file)
    const relativePath = await saveImageFile(dataUrl, item.type, filePath)
    if (relativePath) document.execCommand('insertText', false, `![](${relativePath})`)
    break
  }
}

export async function handleImageDrop(e: React.DragEvent, filePath: string): Promise<void> {
  const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
  if (files.length === 0) return
  e.preventDefault()
  const file = files[0]
  const dataUrl = await readFileAsDataUrl(file)
  const relativePath = await saveImageFile(dataUrl, file.type, filePath)
  if (relativePath) document.execCommand('insertText', false, `![](${relativePath})`)
}
