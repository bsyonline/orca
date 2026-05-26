import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { ElectronAPI } from '../types'

const api: ElectronAPI = {
  openFolder: () => ipcRenderer.invoke('file:openFolder'),
  newFile: () => ipcRenderer.invoke('file:newFile'),
  renameFile: (filePath) => ipcRenderer.invoke('file:renameFile', filePath),
  deleteFile: (filePath) => ipcRenderer.invoke('file:deleteFile', filePath),
  duplicateFile: (filePath) => ipcRenderer.invoke('file:duplicateFile', filePath),
  moveFile: (filePath) => ipcRenderer.invoke('file:moveFile', filePath),
  revealInFinder: (filePath) => ipcRenderer.invoke('file:revealInFinder', filePath),
  insertLocalImage: () => ipcRenderer.invoke('file:insertLocalImage'),
  listDir: (dirPath) => ipcRenderer.invoke('file:listDir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('file:readFile', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('file:writeFile', filePath, content),
  saveImage: (destDir, imageData, ext) => ipcRenderer.invoke('file:saveImage', destDir, imageData, ext),
  exportHTML: (filePath, html) => ipcRenderer.invoke('export:html', filePath, html),
  exportPDF: (filePath) => ipcRenderer.invoke('export:pdf', filePath),
  exportWord: (filePath, buffer) => ipcRenderer.invoke('export:word', filePath, buffer),
  showWordCount: (words, chars, charsNoSpaces) =>
    ipcRenderer.invoke('file:showWordCount', words, chars, charsNoSpaces),

  onMenuOpenFolder: (callback) => {
    ipcRenderer.on('menu:openFolder', callback)
    return () => ipcRenderer.removeListener('menu:openFolder', callback)
  },
  onMenuNewFile: (callback) => {
    ipcRenderer.on('menu:newFile', callback)
    return () => ipcRenderer.removeListener('menu:newFile', callback)
  },
  onMenuRenameFile: (callback) => {
    ipcRenderer.on('menu:renameFile', callback)
    return () => ipcRenderer.removeListener('menu:renameFile', callback)
  },
  onMenuDeleteFile: (callback) => {
    ipcRenderer.on('menu:deleteFile', callback)
    return () => ipcRenderer.removeListener('menu:deleteFile', callback)
  },
  onMenuDuplicateFile: (callback) => {
    ipcRenderer.on('menu:duplicateFile', callback)
    return () => ipcRenderer.removeListener('menu:duplicateFile', callback)
  },
  onMenuMoveFile: (callback) => {
    ipcRenderer.on('menu:moveFile', callback)
    return () => ipcRenderer.removeListener('menu:moveFile', callback)
  },
  onMenuRevealInFinder: (callback) => {
    ipcRenderer.on('menu:revealInFinder', callback)
    return () => ipcRenderer.removeListener('menu:revealInFinder', callback)
  },
  onMenuExportHTML: (callback) => {
    ipcRenderer.on('menu:exportHTML', callback)
    return () => ipcRenderer.removeListener('menu:exportHTML', callback)
  },
  onMenuExportPDF: (callback) => {
    ipcRenderer.on('menu:exportPDF', callback)
    return () => ipcRenderer.removeListener('menu:exportPDF', callback)
  },
  onMenuExportWord: (callback) => {
    ipcRenderer.on('menu:exportWord', callback)
    return () => ipcRenderer.removeListener('menu:exportWord', callback)
  },
  onMenuSave: (callback) => {
    ipcRenderer.on('menu:save', callback)
    return () => ipcRenderer.removeListener('menu:save', callback)
  },
  onMenuFormat: (callback) => {
    const handler = (_e: IpcRendererEvent, type: string) => callback(type)
    ipcRenderer.on('menu:format', handler)
    return () => ipcRenderer.removeListener('menu:format', handler)
  },
  onMenuParagraph: (callback) => {
    const handler = (_e: IpcRendererEvent, type: string) => callback(type)
    ipcRenderer.on('menu:paragraph', handler)
    return () => ipcRenderer.removeListener('menu:paragraph', handler)
  },
  onMenuInsertImage: (callback) => {
    ipcRenderer.on('menu:insertImage', callback)
    return () => ipcRenderer.removeListener('menu:insertImage', callback)
  },
  onMenuCopyMarkdown: (callback) => {
    ipcRenderer.on('menu:copyMarkdown', callback)
    return () => ipcRenderer.removeListener('menu:copyMarkdown', callback)
  },
  onMenuCopyAsText: (callback) => {
    ipcRenderer.on('menu:copyAsText', callback)
    return () => ipcRenderer.removeListener('menu:copyAsText', callback)
  },
  onMenuCopyAsHTML: (callback) => {
    ipcRenderer.on('menu:copyAsHTML', callback)
    return () => ipcRenderer.removeListener('menu:copyAsHTML', callback)
  },
  onMenuPasteAsText: (callback) => {
    ipcRenderer.on('menu:pasteAsText', callback)
    return () => ipcRenderer.removeListener('menu:pasteAsText', callback)
  },
  onMenuMoveLineUp: (callback) => {
    ipcRenderer.on('menu:moveLineUp', callback)
    return () => ipcRenderer.removeListener('menu:moveLineUp', callback)
  },
  onMenuMoveLineDown: (callback) => {
    ipcRenderer.on('menu:moveLineDown', callback)
    return () => ipcRenderer.removeListener('menu:moveLineDown', callback)
  },
  onMenuToggleSidebar: (callback) => {
    ipcRenderer.on('menu:toggleSidebar', callback)
    return () => ipcRenderer.removeListener('menu:toggleSidebar', callback)
  },
  onMenuToggleSourceMode: (callback) => {
    ipcRenderer.on('menu:toggleSourceMode', callback)
    return () => ipcRenderer.removeListener('menu:toggleSourceMode', callback)
  },
  onMenuToggleFocusMode: (callback) => {
    ipcRenderer.on('menu:toggleFocusMode', callback)
    return () => ipcRenderer.removeListener('menu:toggleFocusMode', callback)
  },
  onMenuToggleTypingMode: (callback) => {
    ipcRenderer.on('menu:toggleTypingMode', callback)
    return () => ipcRenderer.removeListener('menu:toggleTypingMode', callback)
  },
  onMenuWordCount: (callback) => {
    ipcRenderer.on('menu:wordCount', callback)
    return () => ipcRenderer.removeListener('menu:wordCount', callback)
  },
}

contextBridge.exposeInMainWorld('api', api)
