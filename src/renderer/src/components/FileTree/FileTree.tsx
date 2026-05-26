import './FileTree.css'
import { useAppStore } from '../../store/useAppStore'
import { FileNode } from './FileNode'
import { basename } from '../../lib/pathUtils'

interface FileTreeProps {
  onOpenFolder: () => void
  onFileSelect: (path: string) => void
  onNewFile: () => void
}

export function FileTree({ onOpenFolder, onFileSelect, onNewFile }: FileTreeProps) {
  const { workspaceRoot, fileTree } = useAppStore()

  return (
    <div className="file-tree">
      {/* macOS titlebar drag region */}
      <div className="file-tree-titlebar" />

      {/* Search bar */}
      <div className="file-tree-search">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="file-tree-search-icon">
          <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
        </svg>
        <input className="file-tree-search-input" placeholder="搜索文档" readOnly />
        <span className="file-tree-search-kbd">⌘K</span>
      </div>

      {/* Workspace header */}
      {workspaceRoot && (
        <div className="file-tree-header">
          <span className="file-tree-header-label">{basename(workspaceRoot)}</span>
          <button className="open-folder-btn-sm" onClick={onOpenFolder}>切换</button>
        </div>
      )}

      {/* File list */}
      <div className="file-tree-body">
        {!workspaceRoot && (
          <p className="file-tree-empty">还没有打开文件夹</p>
        )}
        {fileTree.map((node) => (
          <FileNode key={node.path} node={node} onFileSelect={onFileSelect} />
        ))}
      </div>

      {/* Footer actions */}
      <div className="file-tree-footer">
        <button className="file-tree-new-btn" onClick={workspaceRoot ? onNewFile : onOpenFolder}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span>{workspaceRoot ? '新建文档' : '打开文件夹'}</span>
        </button>
      </div>
    </div>
  )
}
