import { ipcMain, dialog, BrowserWindow, app, shell } from 'electron'
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
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'openFile'],
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })
    if (result.canceled) return null
    const p = result.filePaths[0]
    if (p.endsWith('.md')) app.addRecentDocument(p)
    return p
  })

  ipcMain.removeHandler('file:newFile')
  ipcMain.handle('file:newFile', async () => {
    const result = await dialog.showSaveDialog(win, {
      title: '新建 Markdown 文件',
      defaultPath: 'untitled.md',
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })
    if (result.canceled || !result.filePath) return null
    await fs.promises.writeFile(result.filePath, '', 'utf-8')
    app.addRecentDocument(result.filePath)
    return result.filePath
  })

  ipcMain.removeHandler('file:renameFile')
  ipcMain.handle('file:renameFile', async (_event, filePath: string) => {
    const dir = path.dirname(filePath)
    const ext = path.extname(filePath)
    const result = await dialog.showSaveDialog(win, {
      title: '重新命名',
      defaultPath: path.join(dir, path.basename(filePath, ext)),
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })
    if (result.canceled || !result.filePath) return null
    const newPath = result.filePath.endsWith('.md') ? result.filePath : result.filePath + '.md'
    await fs.promises.rename(filePath, newPath)
    app.addRecentDocument(newPath)
    return newPath
  })

  ipcMain.removeHandler('file:deleteFile')
  ipcMain.handle('file:deleteFile', async (_event, filePath: string) => {
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      message: `确认删除 "${path.basename(filePath)}"？`,
      detail: '此操作不可恢复。',
      buttons: ['删除', '取消'],
      defaultId: 1,
      cancelId: 1,
    })
    if (response !== 0) return false
    await fs.promises.unlink(filePath)
    return true
  })

  ipcMain.removeHandler('file:duplicateFile')
  ipcMain.handle('file:duplicateFile', async (_event, filePath: string) => {
    const dir = path.dirname(filePath)
    const ext = path.extname(filePath)
    const base = path.basename(filePath, ext)
    const result = await dialog.showSaveDialog(win, {
      title: '复制文件',
      defaultPath: path.join(dir, `${base} 副本${ext}`),
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })
    if (result.canceled || !result.filePath) return null
    const destPath = result.filePath.endsWith('.md') ? result.filePath : result.filePath + '.md'
    await fs.promises.copyFile(filePath, destPath)
    app.addRecentDocument(destPath)
    return destPath
  })

  ipcMain.removeHandler('file:moveFile')
  ipcMain.handle('file:moveFile', async (_event, filePath: string) => {
    const result = await dialog.showOpenDialog(win, {
      title: '移到',
      properties: ['openDirectory'],
    })
    if (result.canceled || !result.filePaths[0]) return null
    const destPath = path.join(result.filePaths[0], path.basename(filePath))
    await fs.promises.rename(filePath, destPath)
    app.addRecentDocument(destPath)
    return destPath
  })

  ipcMain.removeHandler('file:revealInFinder')
  ipcMain.handle('file:revealInFinder', (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.removeHandler('file:insertLocalImage')
  ipcMain.handle('file:insertLocalImage', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: '插入图片',
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] }],
    })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })

  ipcMain.removeHandler('file:showWordCount')
  ipcMain.handle('file:showWordCount', async (_event, words: number, chars: number, charsNoSpaces: number) => {
    await dialog.showMessageBox(win, {
      type: 'info',
      title: '字数统计',
      message: '当前文档统计',
      detail: `字数：${words}\n字符数（含空格）：${chars}\n字符数（不含空格）：${charsNoSpaces}`,
      buttons: ['关闭'],
    })
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
