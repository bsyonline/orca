import { ipcMain, BrowserWindow } from 'electron'
import fs from 'node:fs'

export function registerExportHandlers(win: BrowserWindow): void {
  ipcMain.handle('export:html', (_event, filePath: string, html: string) => {
    fs.writeFileSync(filePath, html, 'utf-8')
  })

  ipcMain.handle('export:pdf', async (_event, filePath: string) => {
    const data = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 1, bottom: 1, left: 1, right: 1 },
    })
    fs.writeFileSync(filePath, data)
  })

  ipcMain.handle('export:word', (_event, filePath: string, buffer: Uint8Array) => {
    fs.writeFileSync(filePath, Buffer.from(buffer))
  })
}
