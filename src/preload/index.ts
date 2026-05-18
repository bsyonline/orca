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
}

contextBridge.exposeInMainWorld('api', api)
