import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../types'

const api: ElectronAPI = {
  openFolder: () => ipcRenderer.invoke('file:openFolder'),
  listDir: (dirPath) => ipcRenderer.invoke('file:listDir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('file:readFile', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('file:writeFile', filePath, content),
  saveImage: (destDir, imageData, ext) => ipcRenderer.invoke('file:saveImage', destDir, imageData, ext),
  exportHTML: (filePath, html) => ipcRenderer.invoke('export:html', filePath, html),
  exportPDF: (filePath) => ipcRenderer.invoke('export:pdf', filePath),
  exportWord: (filePath, buffer) => ipcRenderer.invoke('export:word', filePath, buffer),
  onMenuOpenFolder: (callback) => {
    ipcRenderer.on('menu:openFolder', callback)
    return () => ipcRenderer.removeListener('menu:openFolder', callback)
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
}

contextBridge.exposeInMainWorld('api', api)
