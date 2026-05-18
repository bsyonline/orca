export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

export interface ElectronAPI {
  openFolder: () => Promise<string | null>
  listDir: (dirPath: string) => Promise<FileNode[]>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<void>
  saveImage: (destDir: string, imageData: string, ext: string) => Promise<string>
  exportHTML: (filePath: string, html: string) => Promise<void>
  exportPDF: (filePath: string) => Promise<void>
  exportWord: (filePath: string, buffer: Uint8Array) => Promise<void>
  onMenuOpenFolder: (callback: () => void) => () => void
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
