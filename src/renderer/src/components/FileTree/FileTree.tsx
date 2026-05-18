import './FileTree.css'
import { useAppStore } from '../../store/useAppStore'
import { FileNode } from './FileNode'
import { basename } from '../../lib/pathUtils'

interface FileTreeProps {
  onOpenFolder: () => void
  onFileSelect: (path: string) => void
}

export function FileTree({ onOpenFolder, onFileSelect }: FileTreeProps) {
  const { workspaceRoot, fileTree } = useAppStore()

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span>{workspaceRoot ? basename(workspaceRoot) : '文件'}</span>
        <button className="open-folder-btn-sm" onClick={onOpenFolder}>打开</button>
      </div>
      {!workspaceRoot && (
        <button className="open-folder-btn" onClick={onOpenFolder}>打开文件夹</button>
      )}
      {fileTree.map((node) => (
        <FileNode key={node.path} node={node} onFileSelect={onFileSelect} />
      ))}
    </div>
  )
}
