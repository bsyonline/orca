import './App.css'
import { useState, useEffect } from 'react'
import { MilkdownProvider } from '@milkdown/react'
import { FileTree } from './components/FileTree/FileTree'
import { Editor } from './components/Editor/Editor'
import { StatusBar } from './components/StatusBar/StatusBar'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const { activeFile, setActiveFile, setFileTree, setWorkspaceRoot } = useAppStore()
  const [fileContent, setFileContent] = useState<string>('')

  const handleOpenFolder = async () => {
    const folderPath = await window.api.openFolder()
    if (!folderPath) return
    setWorkspaceRoot(folderPath)
    const tree = await window.api.listDir(folderPath)
    setFileTree(tree)
  }

  const handleFileSelect = async (filePath: string) => {
    const content = await window.api.readFile(filePath)
    setFileContent(content)
    setActiveFile(filePath)
  }

  useEffect(() => {
    const cleanup = window.api.onMenuOpenFolder(handleOpenFolder)
    return cleanup
  }, [])

  return (
    <MilkdownProvider>
      <div className="app">
        <div className="app-body">
          <aside className="sidebar">
            <FileTree onOpenFolder={handleOpenFolder} onFileSelect={handleFileSelect} />
          </aside>
          <main className="editor-area">
            {activeFile ? (
              <Editor key={activeFile} filePath={activeFile} initialContent={fileContent} />
            ) : (
              <div className="editor-empty">从左侧打开文件夹，选择一个 .md 文件开始编辑</div>
            )}
          </main>
        </div>
        <StatusBar />
      </div>
    </MilkdownProvider>
  )
}
