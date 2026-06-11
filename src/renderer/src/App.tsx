import './App.css'
import { useEffect, useState } from 'react'
import { MilkdownProvider } from '@milkdown/react'
import { FileTree } from './components/FileTree/FileTree'
import { Editor } from './components/Editor/Editor'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const { activeFile, activeFileContent, openFile, setFileTree, setWorkspaceRoot, setActiveFile, workspaceRoot } = useAppStore()
  const [sidebarVisible, setSidebarVisible] = useState(workspaceRoot !== null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleOpenFolder = async () => {
    const selectedPath = await window.api.openFolder()
    if (!selectedPath) return
    if (selectedPath.endsWith('.md')) {
      const content = await window.api.readFile(selectedPath)
      openFile(selectedPath, content)
      setSidebarVisible(false)
    } else {
      setWorkspaceRoot(selectedPath)
      const tree = await window.api.listDir(selectedPath)
      setFileTree(tree)
      setSidebarVisible(true)
    }
  }

  const handleFileSelect = async (filePath: string) => {
    const content = await window.api.readFile(filePath)
    openFile(filePath, content)
  }

  const handleNewFile = async () => {
    const filePath = await window.api.newFile()
    if (filePath) openFile(filePath, '')
  }

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items[0]?.kind === 'file') {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0] as File & { path: string }
    if (!file?.path?.endsWith('.md')) return
    await handleFileSelect(file.path)
  }

  useEffect(() => {
    const cleanup = window.api.onMenuOpenFolder(handleOpenFolder)
    return cleanup
  }, [])

  useEffect(() => {
    const cleanup = window.api.onMenuNewFile(async () => {
      const filePath = await window.api.newFile()
      if (filePath) openFile(filePath, '')
    })
    return cleanup
  }, [])

  useEffect(() => {
    const cleanup = window.api.onMenuRenameFile(async () => {
      if (!activeFile) return
      const newPath = await window.api.renameFile(activeFile)
      if (newPath) setActiveFile(newPath)
    })
    return cleanup
  }, [activeFile])

  useEffect(() => {
    const cleanup = window.api.onMenuDeleteFile(async () => {
      if (!activeFile) return
      const deleted = await window.api.deleteFile(activeFile)
      if (deleted) setActiveFile(null)
    })
    return cleanup
  }, [activeFile])

  useEffect(() => {
    const cleanup = window.api.onMenuToggleSidebar(() => setSidebarVisible((v) => !v))
    return cleanup
  }, [])

  useEffect(() => {
    const cleanup = window.api.onMenuToggleFocusMode(() => setSidebarVisible((v) => !v))
    return cleanup
  }, [])

  useEffect(() => {
    const cleanup = window.api.onMenuRevealInFinder(async () => {
      if (!activeFile) return
      await window.api.revealInFinder(activeFile)
    })
    return cleanup
  }, [activeFile])

  useEffect(() => {
    const cleanup = window.api.onMenuDuplicateFile(async () => {
      if (!activeFile) return
      const newPath = await window.api.duplicateFile(activeFile)
      if (newPath) {
        const content = await window.api.readFile(newPath)
        openFile(newPath, content)
      }
    })
    return cleanup
  }, [activeFile])

  useEffect(() => {
    const cleanup = window.api.onMenuMoveFile(async () => {
      if (!activeFile) return
      const newPath = await window.api.moveFile(activeFile)
      if (newPath) setActiveFile(newPath)
    })
    return cleanup
  }, [activeFile])

  return (
    <MilkdownProvider>
      <div className={`app${sidebarVisible ? '' : ' sidebar-hidden'}`}>
        <div className="app-body">
          {sidebarVisible && (
            <aside className="sidebar">
              <FileTree onOpenFolder={handleOpenFolder} onFileSelect={handleFileSelect} onNewFile={handleNewFile} />
            </aside>
          )}
          <main
            className={`editor-area${isDragOver ? ' drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="titlebar-drag" />
            {activeFile ? (
              <Editor key={activeFile} filePath={activeFile} initialContent={activeFileContent} />
            ) : (
              <div className="editor-empty">从左侧打开文件夹，选择一个 .md 文件开始编辑</div>
            )}
          </main>
        </div>
      </div>
    </MilkdownProvider>
  )
}
