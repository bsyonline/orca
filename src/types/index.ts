export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

export interface ElectronAPI {
  // File operations
  openFolder: () => Promise<string | null>
  newFile: () => Promise<string | null>
  renameFile: (filePath: string) => Promise<string | null>
  deleteFile: (filePath: string) => Promise<boolean>
  duplicateFile: (filePath: string) => Promise<string | null>
  moveFile: (filePath: string) => Promise<string | null>
  revealInFinder: (filePath: string) => Promise<void>
  insertLocalImage: () => Promise<string | null>
  listDir: (dirPath: string) => Promise<FileNode[]>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<void>
  saveImage: (destDir: string, imageData: string, ext: string) => Promise<string>
  // Export
  exportHTML: (filePath: string, html: string) => Promise<void>
  exportPDF: (filePath: string) => Promise<void>
  exportWord: (filePath: string, buffer: Uint8Array) => Promise<void>
  // UI helpers
  showWordCount: (words: number, chars: number, charsNoSpaces: number) => Promise<void>
  // Menu events - file
  onMenuOpenFolder: (callback: () => void) => () => void
  onMenuNewFile: (callback: () => void) => () => void
  onMenuRenameFile: (callback: () => void) => () => void
  onMenuDeleteFile: (callback: () => void) => () => void
  onMenuDuplicateFile: (callback: () => void) => () => void
  onMenuMoveFile: (callback: () => void) => () => void
  onMenuRevealInFinder: (callback: () => void) => () => void
  // Menu events - export
  onMenuExportHTML: (callback: () => void) => () => void
  onMenuExportPDF: (callback: () => void) => () => void
  onMenuExportWord: (callback: () => void) => () => void
  // Menu events - editor
  onMenuSave: (callback: () => void) => () => void
  onMenuFormat: (callback: (type: string) => void) => () => void
  onMenuParagraph: (callback: (type: string) => void) => () => void
  onMenuInsertImage: (callback: () => void) => () => void
  // Menu events - clipboard
  onMenuCopyMarkdown: (callback: () => void) => () => void
  onMenuCopyAsText: (callback: () => void) => () => void
  onMenuCopyAsHTML: (callback: () => void) => () => void
  onMenuPasteAsText: (callback: () => void) => () => void
  // Menu events - line operations
  onMenuMoveLineUp: (callback: () => void) => () => void
  onMenuMoveLineDown: (callback: () => void) => () => void
  // Menu events - display
  onMenuToggleSidebar: (callback: () => void) => () => void
  onMenuToggleSourceMode: (callback: () => void) => () => void
  onMenuToggleFocusMode: (callback: () => void) => () => void
  onMenuToggleTypingMode: (callback: () => void) => () => void
  onMenuWordCount: (callback: () => void) => () => void
}
