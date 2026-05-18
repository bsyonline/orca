import { app, BrowserWindow, Menu, MenuItem } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerFileHandlers } from './handlers/file'
import { registerExportHandlers } from './handlers/export'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    titleBarStyle: 'hiddenInset',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  registerFileHandlers(win)
  registerExportHandlers(win)
  buildMenu(win)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function buildMenu(win: BrowserWindow): void {
  const menu = new Menu()
  menu.append(new MenuItem({
    label: app.name,
    submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }],
  }))
  menu.append(new MenuItem({
    label: '文件',
    submenu: [
      { label: '打开文件夹', accelerator: 'CmdOrCtrl+O', click: () => win.webContents.send('menu:openFolder') },
      { type: 'separator' },
      { label: '导出为 HTML', accelerator: 'CmdOrCtrl+Shift+H', click: () => win.webContents.send('menu:exportHTML') },
      { label: '导出为 PDF', accelerator: 'CmdOrCtrl+Shift+P', click: () => win.webContents.send('menu:exportPDF') },
      { label: '导出为 Word', accelerator: 'CmdOrCtrl+Shift+W', click: () => win.webContents.send('menu:exportWord') },
    ],
  }))
  menu.append(new MenuItem({ label: '编辑', role: 'editMenu' }))
  menu.append(new MenuItem({ label: '视图', role: 'viewMenu' }))
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
