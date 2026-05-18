import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { FileNode } from '../../types'

async function buildFileTree(dirPath: string): Promise<FileNode[]> {
  let entries: fs.Dirent[]
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
  } catch {
    return []
  }
  const nodes = await Promise.all(
    entries
      .filter((e) => !e.name.startsWith('.'))
      .map(async (e): Promise<FileNode> => {
        const fullPath = path.join(dirPath, e.name)
        if (e.isDirectory()) {
          return { name: e.name, path: fullPath, type: 'directory', children: await buildFileTree(fullPath) }
        }
        return { name: e.name, path: fullPath, type: 'file' }
      }),
  )
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function registerFileHandlers(win: BrowserWindow): void {
  ipcMain.removeHandler('file:openFolder')
  ipcMain.handle('file:openFolder', async () => {
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.removeHandler('file:listDir')
  ipcMain.handle('file:listDir', (_event, dirPath: string) => buildFileTree(dirPath))

  ipcMain.removeHandler('file:readFile')
  ipcMain.handle('file:readFile', (_event, filePath: string) =>
    fs.promises.readFile(filePath, 'utf-8'),
  )

  ipcMain.removeHandler('file:writeFile')
  ipcMain.handle('file:writeFile', (_event, filePath: string, content: string) =>
    fs.promises.writeFile(filePath, content, 'utf-8'),
  )

  ipcMain.removeHandler('file:saveImage')
  ipcMain.handle('file:saveImage', async (_event, destDir: string, imageData: string, ext: string) => {
    const assetsDir = path.join(destDir, 'assets')
    await fs.promises.mkdir(assetsDir, { recursive: true })
    const filename = `image-${Date.now()}.${ext}`
    await fs.promises.writeFile(path.join(assetsDir, filename), Buffer.from(imageData, 'base64'))
    return `./assets/${filename}`
  })
}
