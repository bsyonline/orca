import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileTree } from '../components/FileTree/FileTree'
import { useAppStore } from '../store/useAppStore'

describe('FileTree', () => {
  it('shows "打开文件夹" button when no workspace', () => {
    useAppStore.setState({ workspaceRoot: null, fileTree: [], activeFile: null })
    render(<FileTree onOpenFolder={vi.fn()} onFileSelect={vi.fn()} onNewFile={vi.fn()} />)
    expect(screen.getByText('打开文件夹')).toBeInTheDocument()
  })

  it('renders .md files from fileTree', () => {
    useAppStore.setState({
      workspaceRoot: '/docs',
      fileTree: [{ name: 'note.md', path: '/docs/note.md', type: 'file' }],
      activeFile: null,
    })
    render(<FileTree onOpenFolder={vi.fn()} onFileSelect={vi.fn()} onNewFile={vi.fn()} />)
    expect(screen.getByText('note.md')).toBeInTheDocument()
  })

  it('calls onFileSelect when a file is clicked', () => {
    const onFileSelect = vi.fn()
    useAppStore.setState({
      workspaceRoot: '/docs',
      fileTree: [{ name: 'note.md', path: '/docs/note.md', type: 'file' }],
      activeFile: null,
    })
    render(<FileTree onOpenFolder={vi.fn()} onFileSelect={onFileSelect} onNewFile={vi.fn()} />)
    fireEvent.click(screen.getByText('note.md'))
    expect(onFileSelect).toHaveBeenCalledWith('/docs/note.md')
  })
})
