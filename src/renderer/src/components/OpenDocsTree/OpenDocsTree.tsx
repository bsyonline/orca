import './OpenDocsTree.css'
import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { buildOpenDocsTree, type OpenDocTreeNode } from '../../lib/buildOpenDocsTree'

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.25 3.5L8.75 7L5.25 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.625 1.75C2.625 1.40482 2.90482 1.125 3.25 1.125H8.01777C8.18291 1.125 8.34122 1.19135 8.45881 1.30806L11.191 4.02356C11.3093 4.14102 11.375 4.29917 11.375 4.46389V12.25C11.375 12.5952 11.0952 12.875 10.75 12.875H3.25C2.90482 12.875 2.625 12.5952 2.625 12.25V1.75Z" stroke="currentColor" strokeWidth="1.125" strokeLinejoin="round" />
    </svg>
  )
}

interface OpenDocsTreeProps {
  openDocs: string[]
  onSelect: (path: string) => void
  onClose: (path: string) => void
}

interface NodeProps {
  node: OpenDocTreeNode
  onSelect: (path: string) => void
  onClose: (path: string) => void
}

function TreeNode({ node, onSelect, onClose }: NodeProps) {
  const [expanded, setExpanded] = useState(true)
  const activeFile = useAppStore((s) => s.activeFile)

  if (node.type === 'directory') {
    return (
      <div>
        <div className="file-node directory" onClick={() => setExpanded((e) => !e)}>
          <span className="file-node-icon">{expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}</span>
          <span>{node.name}</span>
        </div>
        {expanded && (
          <div className="file-node-children">
            {node.children.map((child) => (
              <TreeNode
                key={child.type === 'file' ? child.path : child.name}
                node={child}
                onSelect={onSelect}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`file-node open-doc-leaf ${activeFile === node.path ? 'active' : ''}`}
      onClick={() => onSelect(node.path)}
    >
      <span className="file-node-icon">
        <FileIcon />
      </span>
      <span>{node.name}</span>
      <button
        className="open-doc-close"
        aria-label={`关闭 ${node.name}`}
        onClick={(e) => {
          e.stopPropagation()
          onClose(node.path)
        }}
      >
        ×
      </button>
    </div>
  )
}

export function OpenDocsTree({ openDocs, onSelect, onClose }: OpenDocsTreeProps) {
  const tree = buildOpenDocsTree(openDocs)

  return (
    <div className="open-docs-tree">
      <div className="file-tree-titlebar" />
      <div className="open-docs-header">打开的文档</div>
      <div className="file-tree-body">
        {tree.map((node) => (
          <TreeNode
            key={node.type === 'file' ? node.path : node.name}
            node={node}
            onSelect={onSelect}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  )
}
