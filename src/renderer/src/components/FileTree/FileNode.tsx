import { useState } from 'react'
import type { FileNode as FileNodeType } from '../../../../types'
import { useAppStore } from '../../store/useAppStore'

interface FileNodeProps {
  node: FileNodeType
  onFileSelect: (path: string) => void
}

export function FileNode({ node, onFileSelect }: FileNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const activeFile = useAppStore((s) => s.activeFile)

  if (node.type === 'directory') {
    return (
      <div>
        <div className="file-node directory" onClick={() => setExpanded((e) => !e)}>
          <span className="file-node-icon">{expanded ? '▾' : '▸'}</span>
          <span>{node.name}</span>
        </div>
        {expanded && node.children && (
          <div className="file-node-children">
            {node.children.map((child) => (
              <FileNode key={child.path} node={child} onFileSelect={onFileSelect} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!node.name.endsWith('.md')) return null

  return (
    <div
      className={`file-node ${activeFile === node.path ? 'active' : ''}`}
      onClick={() => onFileSelect(node.path)}
    >
      <span className="file-node-icon">◻</span>
      <span>{node.name}</span>
    </div>
  )
}
