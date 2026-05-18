import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { FileNode } from '../../types'

function buildFileTree(dirPath: string): FileNode[] {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((e) => !e.name.startsWith('.'))
    .map((e): FileNode => {
      const fullPath = path.join(dirPath, e.name)
      if (e.isDirectory()) {
        return { name: e.name, path: fullPath, type: 'directory', children: buildFileTree(fullPath) }
      }
      return { name: e.name, path: fullPath, type: 'file' }
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

export function registerFileHandlers(win: BrowserWindow): void {
  ipcMain.handle('file:openFolder', async () => {
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('file:listDir', (_event, dirPath: string) => buildFileTree(dirPath))

  ipcMain.handle('file:readFile', (_event, filePath: string) =>
    fs.readFileSync(filePath, 'utf-8'),
  )

  ipcMain.handle('file:writeFile', (_event, filePath: string, content: string) => {
    fs.writeFileSync(filePath, content, 'utf-8')
  })

  ipcMain.handle('file:saveImage', (_event, destDir: string, imageData: string, ext: string) => {
    const assetsDir = path.join(destDir, 'assets')
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true })
    const filename = `image-${Date.now()}.${ext}`
    fs.writeFileSync(path.join(assetsDir, filename), Buffer.from(imageData, 'base64'))
    return `./assets/${filename}`
  })
}
