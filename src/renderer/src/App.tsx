import './App.css'
import { useEffect, useState } from 'react'
import { MilkdownProvider } from '@milkdown/react'
import { FileTree } from './components/FileTree/FileTree'
import { OpenDocsTree } from './components/OpenDocsTree/OpenDocsTree'
import { Editor } from './components/Editor/Editor'
import { EditorErrorBoundary } from './components/Editor/EditorErrorBoundary'
import { SidebarResizer } from './components/SidebarResizer/SidebarResizer'
import { useAppStore } from './store/useAppStore'

const MIN_SIDEBAR_WIDTH = 80
const MAX_SIDEBAR_WIDTH_RATIO = 0.5

function isMarkdownFile(filePath: string): boolean {
  return /\.(md|markdown)$/i.test(filePath)
}

export default function App() {
  const { activeFile, activeFileContent, openFile, setFileTree, setWorkspaceRoot, setActiveFile, workspaceRoot, openDocs, closeDoc } = useAppStore()
  // Default visible so the open-docs tree appears as soon as a 2nd doc opens
  // (no setState during open — which would add a spurious render). Focus mode /
  // toggle-sidebar flip this to hide it. Workspace mode sets it explicitly on open.
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(240)

  // Single-file mode: show the open-docs sidebar when 2+ docs are open AND the
  // user hasn't hidden it via focus mode / toggle-sidebar. Workspace mode keeps
  // its existing user-controlled visibility.
  const effectiveSidebarVisible =
    workspaceRoot === null ? openDocs.length >= 2 && sidebarVisible : sidebarVisible

  const handleOpenFolder = async () => {
    const selectedPath = await window.api.openFolder()
    if (!selectedPath) return
    if (isMarkdownFile(selectedPath)) {
      const content = await window.api.readFile(selectedPath)
      openFile(selectedPath, content)
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

  const handleSwitchDoc = async (filePath: string) => {
    if (filePath === activeFile) return
    const content = await window.api.readFile(filePath)
    openFile(filePath, content)
  }

  const handleCloseDoc = async (filePath: string) => {
    const next = closeDoc(filePath)
    // Only the active doc closing should change which doc is active. Closing a
    // background doc just removes it from the list (closeDoc already did that).
    if (filePath === activeFile) {
      if (next) {
        const content = await window.api.readFile(next)
        openFile(next, content)
      } else {
        setActiveFile(null)
      }
    }
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
    if (!file?.path || !isMarkdownFile(file.path)) return
    await handleFileSelect(file.path)
  }

  useEffect(() => {
    const cleanup = window.api.onMenuOpenFolder(handleOpenFolder)
    return cleanup
  }, [])

  useEffect(() => {
    const cleanup = window.api.onOpenFile(async (filePath) => {
      const content = await window.api.readFile(filePath)
      openFile(filePath, content)
    })
    window.api.rendererReady()
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

  useEffect(() => {
    const handleResize = () => {
      const maxWidth = window.innerWidth * MAX_SIDEBAR_WIDTH_RATIO
      if (sidebarWidth > maxWidth) {
        setSidebarWidth(maxWidth)
        document.documentElement.style.setProperty('--sidebar-width', `${maxWidth}px`)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarWidth])

  return (
    <div className={`app${effectiveSidebarVisible ? '' : ' sidebar-hidden'}`} style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}>
      <div className="app-body">
        {effectiveSidebarVisible && (
          <aside className="sidebar">
            {workspaceRoot ? (
              <FileTree onOpenFolder={handleOpenFolder} onFileSelect={handleFileSelect} onNewFile={handleNewFile} />
            ) : (
              <OpenDocsTree openDocs={openDocs} onSelect={handleSwitchDoc} onClose={handleCloseDoc} />
            )}
          </aside>
        )}
        {effectiveSidebarVisible && (
          <SidebarResizer
            currentWidth={sidebarWidth}
            onWidthChange={setSidebarWidth}
            minWidth={MIN_SIDEBAR_WIDTH}
            maxWidthRatio={MAX_SIDEBAR_WIDTH_RATIO}
          />
        )}
        <main
          className={`editor-area${isDragOver ? ' drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="titlebar-drag" />
          {activeFile ? (
            // Key the editor subtree by file path so each document gets a fresh
            // Milkdown instance, factory, and root element. A single long-lived
            // provider shares one editor `div`, and async create() calls from the
            // previous document can resolve late and overwrite the new one — which
            // left the editor showing the previously opened file. The key lives on
            // the error boundary (the outermost element), so remounting it also
            // remounts the provider, and a per-file boundary keeps a crash in one
            // document from blanking the others.
            <EditorErrorBoundary key={activeFile}>
              <MilkdownProvider>
                <Editor filePath={activeFile} initialContent={activeFileContent} />
              </MilkdownProvider>
            </EditorErrorBoundary>
          ) : (
            <div className="editor-empty">从左侧打开文件夹，选择一个 .md 文件开始编辑</div>
          )}
        </main>
      </div>
    </div>
  )
}
