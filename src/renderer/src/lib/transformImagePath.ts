export function transformImagePath(markdown: string, mdFilePath: string): string {
  return markdown.replace(
    /!\[(.*?)\]\(([^)]+)\)/g,
    (match, alt, imagePath) => {
      if (
        imagePath.startsWith('http://') ||
        imagePath.startsWith('https://') ||
        imagePath.startsWith('orca-img://') ||
        imagePath.startsWith('data:')
      ) {
        return match
      }
      const mdDir = mdFilePath.substring(0, mdFilePath.lastIndexOf('/'))
      if (!mdDir) return match
      const absolutePath = resolveRelativePath(mdDir, imagePath)
      return `![${alt}](orca-img://${absolutePath})`
    },
  )
}

export function restoreImagePath(markdown: string, mdFilePath: string): string {
  const mdDir = mdFilePath.substring(0, mdFilePath.lastIndexOf('/'))
  return markdown.replace(
    /!\[(.*?)\]\(orca-img:\/\/([^)]+)\)/g,
    (_, alt, absolutePath) => {
      const decodedPath = decodeURIComponent(absolutePath)
      const relativePath = computeRelativePath(mdDir, decodedPath)
      return `![${alt}](${relativePath})`
    },
  )
}

function resolveRelativePath(baseDir: string, relativePath: string): string {
  const parts = relativePath.split('/')
  const baseParts = baseDir.split('/')
  
  for (const part of parts) {
    if (part === '..') {
      baseParts.pop()
    } else if (part !== '.' && part !== '') {
      baseParts.push(part)
    }
  }
  
  return baseParts.join('/')
}

function computeRelativePath(baseDir: string, absolutePath: string): string {
  const baseParts = baseDir.split('/')
  const targetParts = absolutePath.split('/')
  
  let commonLength = 0
  for (let i = 0; i < Math.min(baseParts.length, targetParts.length); i++) {
    if (baseParts[i] === targetParts[i]) {
      commonLength++
    } else {
      break
    }
  }
  
  const upLevels = baseParts.length - commonLength
  const downParts = targetParts.slice(commonLength)
  
  const upPath = Array(upLevels).fill('..').join('/')
  const downPath = downParts.join('/')
  
  if (upPath === '') {
    return './' + downPath
  }
  return upPath + '/' + downPath
}