export function basename(filePath: string, ext?: string): string {
  const name = filePath.replace(/\\/g, '/').split('/').pop() ?? filePath
  if (ext && name.endsWith(ext)) return name.slice(0, -ext.length)
  return name
}

export function dirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  if (idx <= 0) return ''
  return normalized.slice(0, idx)
}
