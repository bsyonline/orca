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

      {/* Workspace header */}
      {workspaceRoot && (
        <div className="file-tree-header">
          <span className="file-tree-header-label">{basename(workspaceRoot)}</span>
          <button className="open-folder-btn-sm" onClick={onOpenFolder}>切换</button>
        </div>
      )}

      {/* File list */}
      <div className="file-tree-body">
        {fileTree.map((node) => (
          <FileNode key={node.path} node={node} onFileSelect={onFileSelect} />
        ))}
      </div>
    </div>
  )
}
