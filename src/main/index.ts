import { app, BrowserWindow, Menu, protocol } from 'electron'
import { join } from 'node:path'
import fs from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerFileHandlers } from './handlers/file'
import { registerExportHandlers } from './handlers/export'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'oraca-img',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true,
      stream: true,
    },
  },
])

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    titleBarStyle: 'hiddenInset',
    tabbingIdentifier: 'oraca',
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
  const getWin = () => BrowserWindow.getFocusedWindow() || win
  const s = (type: string) => getWin()?.webContents.send(type)
  const p = (type: string) => getWin()?.webContents.send('menu:paragraph', type)
  const f = (type: string) => getWin()?.webContents.send('menu:format', type)
  let alwaysOnTop = false

  const menu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { label: `关于 ${app.name}`, click: () => app.showAboutPanel() },
        { type: 'separator' },
        { label: `隐藏 ${app.name}`, accelerator: 'CmdOrCtrl+H', click: () => app.hide() },
        { label: '隐藏其他', accelerator: 'Alt+CmdOrCtrl+H', enabled: false },
        { label: '显示全部', enabled: false },
        { type: 'separator' },
        { label: `退出 ${app.name}`, accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: '文件',
      submenu: [
        { label: '新建', accelerator: 'CmdOrCtrl+N', click: () => s('menu:newFile') },
        { label: '新建标签页', accelerator: 'CmdOrCtrl+T', click: () => createWindow() },
        { type: 'separator' },
        { label: '打开...', accelerator: 'CmdOrCtrl+O', click: () => s('menu:openFolder') },
        { label: '打开最近文件', role: 'recentDocuments', submenu: [{ role: 'clearRecentDocuments' }] },
        { type: 'separator' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', click: () => getWin()?.close() },
        { type: 'separator' },
        { label: '保存', accelerator: 'CmdOrCtrl+S', click: () => s('menu:save') },
        { label: '重新命名...', click: () => s('menu:renameFile') },
        { label: '移到...', click: () => s('menu:moveFile') },
        { label: '打开文件位置', accelerator: 'CmdOrCtrl+Shift+R', click: () => s('menu:revealInFinder') },
        { label: '复制', accelerator: 'CmdOrCtrl+Shift+D', click: () => s('menu:duplicateFile') },
        { type: 'separator' },
        {
          label: '导出',
          submenu: [
            { label: '导出为 HTML', accelerator: 'CmdOrCtrl+Shift+H', click: () => s('menu:exportHTML') },
            { label: '导出为 PDF', accelerator: 'CmdOrCtrl+Shift+E', click: () => s('menu:exportPDF') },
            { label: '导出为 Word', accelerator: 'CmdOrCtrl+Shift+W', click: () => s('menu:exportWord') },
          ],
        },
        { label: '导入', enabled: false },
        { type: 'separator' },
        { label: '删除...', click: () => s('menu:deleteFile') },
        { type: 'separator' },
        { label: '共享', enabled: false },
        { type: 'separator' },
        { label: '打印...', accelerator: 'CmdOrCtrl+P', click: () => getWin()?.webContents.print({ silent: false, printBackground: true }) },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', click: () => getWin()?.webContents.undo() },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', click: () => getWin()?.webContents.redo() },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', click: () => getWin()?.webContents.cut() },
        { label: '拷贝', accelerator: 'CmdOrCtrl+C', click: () => getWin()?.webContents.copy() },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', click: () => getWin()?.webContents.paste() },
        { label: '按当前格式粘贴', accelerator: 'Alt+Shift+CmdOrCtrl+V', click: () => getWin()?.webContents.pasteAndMatchStyle() },
        { label: '删除', click: () => getWin()?.webContents.delete() },
        { label: '全选', accelerator: 'CmdOrCtrl+A', click: () => getWin()?.webContents.selectAll() },
        { type: 'separator' },
        { label: '复制为 Markdown', accelerator: 'Shift+CmdOrCtrl+C', click: () => s('menu:copyMarkdown') },
        { label: '复制为纯文本', click: () => s('menu:copyAsText') },
        { label: '复制为 HTML', click: () => s('menu:copyAsHTML') },
        { type: 'separator' },
        { label: '粘贴为纯文本', accelerator: 'Shift+CmdOrCtrl+V', click: () => s('menu:pasteAsText') },
        { type: 'separator' },
        { label: '上移该行', accelerator: 'Alt+Up', click: () => s('menu:moveLineUp') },
        { label: '下移该行', accelerator: 'Alt+Down', click: () => s('menu:moveLineDown') },
        { type: 'separator' },
        {
          label: '语音',
          submenu: [
            {
              label: '开始朗读',
              click: () => getWin()?.webContents.executeJavaScript(
                '(() => { speechSynthesis.cancel(); const t = getSelection()?.toString() || document.body.innerText; const u = new SpeechSynthesisUtterance(t.slice(0,5000)); speechSynthesis.speak(u) })()',
              ),
            },
            {
              label: '停止朗读',
              click: () => getWin()?.webContents.executeJavaScript('speechSynthesis.cancel()'),
            },
          ],
        },
      ],
    },
    {
      label: '段落',
      submenu: [
        { label: '一级标题', accelerator: 'CmdOrCtrl+1', click: () => p('h1') },
        { label: '二级标题', accelerator: 'CmdOrCtrl+2', click: () => p('h2') },
        { label: '三级标题', accelerator: 'CmdOrCtrl+3', click: () => p('h3') },
        { label: '四级标题', accelerator: 'CmdOrCtrl+4', click: () => p('h4') },
        { label: '五级标题', accelerator: 'CmdOrCtrl+5', click: () => p('h5') },
        { label: '六级标题', accelerator: 'CmdOrCtrl+6', click: () => p('h6') },
        { label: '段落', accelerator: 'CmdOrCtrl+0', click: () => p('paragraph') },
        { type: 'separator' },
        { label: '提升标题级别', accelerator: 'CmdOrCtrl+=', click: () => p('heading-up') },
        { label: '降低标题级别', accelerator: 'CmdOrCtrl+-', click: () => p('heading-down') },
        { type: 'separator' },
        {
          label: '表格',
          submenu: [
            { label: '插入表格', accelerator: 'CmdOrCtrl+Shift+T', click: () => p('table') },
            { type: 'separator' },
            { label: '添加行', click: () => p('tableAddRow') },
            { label: '添加列', click: () => p('tableAddCol') },
            { label: '删除选中单元格', click: () => p('tableDelCells') },
          ],
        },
        { label: '公式块', accelerator: 'Alt+CmdOrCtrl+B', click: () => p('mathBlock') },
        { label: '代码块', accelerator: 'Alt+CmdOrCtrl+C', click: () => p('codeBlock') },
        { type: 'separator' },
        { label: '引用', accelerator: 'Alt+CmdOrCtrl+Q', click: () => p('quote') },
        { type: 'separator' },
        { label: '有序列表', accelerator: 'Alt+CmdOrCtrl+O', click: () => p('ordered') },
        { label: '无序列表', accelerator: 'Alt+CmdOrCtrl+U', click: () => p('bullet') },
        { label: '任务列表', accelerator: 'Alt+CmdOrCtrl+X', click: () => p('taskList') },
        { type: 'separator' },
        {
          label: '列表缩进',
          submenu: [
            { label: '增加缩进', accelerator: 'Tab', click: () => p('indent') },
            { label: '减少缩进', accelerator: 'Shift+Tab', click: () => p('outdent') },
          ],
        },
        { label: '在上方插入段落', click: () => p('insertAbove') },
        { label: '在下方插入段落', click: () => p('insertBelow') },
        { type: 'separator' },
        { label: '链接引用', accelerator: 'Alt+CmdOrCtrl+L', click: () => p('linkRef') },
        { label: '脚注', accelerator: 'Alt+CmdOrCtrl+R', click: () => p('footnote') },
        { type: 'separator' },
        { label: '水平分割线', accelerator: 'Alt+CmdOrCtrl+-', click: () => p('hr') },
        { label: '内容目录', click: () => p('toc') },
        { label: 'YAML Front Matter', click: () => p('yamlFrontMatter') },
      ],
    },
    {
      label: '格式',
      submenu: [
        { label: '加粗', accelerator: 'CmdOrCtrl+B', click: () => f('bold') },
        { label: '斜体', accelerator: 'CmdOrCtrl+I', click: () => f('italic') },
        { label: '下划线', accelerator: 'CmdOrCtrl+U', enabled: false },
        { type: 'separator' },
        { label: '行内代码', accelerator: 'Control+`', click: () => f('code') },
        { label: '内联公式', accelerator: 'Control+M', click: () => f('mathInline') },
        { label: '删除线', accelerator: 'Control+Shift+`', click: () => f('strikethrough') },
        { label: '高亮', enabled: false },
        { label: '注释', accelerator: 'Control+-', click: () => f('comment') },
        { type: 'separator' },
        { label: '上标', enabled: false },
        { label: '下标', enabled: false },
        { type: 'separator' },
        { label: '超链接', accelerator: 'CmdOrCtrl+K', click: () => f('link') },
        {
          label: '图像',
          submenu: [
            { label: '从本地插入...', click: () => s('menu:insertImage') },
            { label: '从网络插入...', enabled: false },
            { label: '从剪贴板插入', enabled: false },
          ],
        },
        { type: 'separator' },
        { label: '清除样式', accelerator: 'CmdOrCtrl+\\', click: () => f('clearFormat') },
      ],
    },
    {
      label: '显示',
      submenu: [
        { label: '源代码模式', accelerator: 'CmdOrCtrl+/', click: () => s('menu:toggleSourceMode') },
        { label: '专注模式', accelerator: 'F8', click: () => s('menu:toggleFocusMode') },
        { label: '打字机模式', accelerator: 'F9', click: () => s('menu:toggleTypingMode') },
        { type: 'separator' },
        { label: '显示/隐藏侧边栏', accelerator: 'CmdOrCtrl+Shift+L', click: () => s('menu:toggleSidebar') },
        { type: 'separator' },
        { label: '大纲', enabled: false },
        { label: '文档列表', enabled: false },
        { type: 'separator' },
        { label: '字数统计', click: () => s('menu:wordCount') },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'Shift+CmdOrCtrl+0', click: () => getWin()?.webContents.setZoomLevel(0) },
        { label: '放大', accelerator: 'Shift+CmdOrCtrl+=', click: () => { const w = getWin(); if (w) w.webContents.setZoomLevel(w.webContents.getZoomLevel() + 1) } },
        { label: '缩小', accelerator: 'Shift+CmdOrCtrl+-', click: () => { const w = getWin(); if (w) w.webContents.setZoomLevel(w.webContents.getZoomLevel() - 1) } },
        { type: 'separator' },
        { label: '保持窗口在最前端', type: 'checkbox', checked: false, click: (item) => { const w = getWin(); if (w) { alwaysOnTop = item.checked; w.setAlwaysOnTop(alwaysOnTop) } } },
        { type: 'separator' },
        { label: '进入全屏幕', accelerator: 'Ctrl+CmdOrCtrl+F', click: () => { const w = getWin(); if (w) w.setFullScreen(!w.isFullScreen()) } },
      ],
    },
    {
      label: '主题',
      submenu: [
        { label: '亮色主题', type: 'radio', checked: true, enabled: false },
        { label: '暗色主题', type: 'radio', checked: false, enabled: false },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', click: () => getWin()?.minimize() },
        { label: '缩放', click: () => { const w = getWin(); if (w) { w.isMaximized() ? w.unmaximize() : w.maximize() } } },
        { type: 'separator' },
        { label: '前置所有窗口', click: () => BrowserWindow.getAllWindows().forEach((w) => { if (!w.isDestroyed() && w.isMinimized()) w.restore(); w.show() }) },
      ],
    },
    {
      label: '帮助',
      submenu: [
        { label: '检查更新...', enabled: false },
        { type: 'separator' },
        { label: '切换开发者工具', accelerator: 'F12', click: () => getWin()?.webContents.toggleDevTools() },
      ],
    },
  ])

  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  protocol.handle('oraca-img', (request) => {
    const url = request.url
    let filePath = url.slice('oraca-img:'.length)
    if (filePath.startsWith('//')) {
      filePath = filePath.slice(2)
    }
    if (!filePath.startsWith('/')) {
      filePath = '/' + filePath
    }
    filePath = decodeURIComponent(filePath)
    
    try {
      const data = fs.readFileSync(filePath)
      const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
      const mimeTypes: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        bmp: 'image/bmp',
      }
      const mimeType = mimeTypes[ext] || 'image/png'
      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(data.length),
          'Access-Control-Allow-Origin': '*',
        },
      })
    } catch {
      return new Response(null, { status: 404 })
    }
  })

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
