import { ipcMain, BrowserWindow } from 'electron'
import fs from 'node:fs'

export function registerExportHandlers(win: BrowserWindow): void {
  ipcMain.removeHandler('export:html')
  ipcMain.handle('export:html', (_event, filePath: string, html: string) =>
    fs.promises.writeFile(filePath, html, 'utf-8'),
  )

  ipcMain.removeHandler('export:pdf')
  ipcMain.handle('export:pdf', async (_event, filePath: string) => {
    const data = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 1, bottom: 1, left: 1, right: 1 },
    })
    await fs.promises.writeFile(filePath, data)
  })

  ipcMain.removeHandler('export:word')
  ipcMain.handle('export:word', (_event, filePath: string, buffer: Uint8Array) =>
    fs.promises.writeFile(filePath, Buffer.from(buffer)),
  )
}
