import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OpenDocsTree } from '../OpenDocsTree'
import { useAppStore } from '../../../store/useAppStore'

describe('OpenDocsTree', () => {
  beforeEach(() => {
    useAppStore.setState({ activeFile: '/foo/bar/b.md' })
  })

  it('renders a leaf per open document', () => {
    render(<OpenDocsTree openDocs={['/foo/a.md', '/foo/bar/b.md']} onSelect={() => {}} onClose={() => {}} />)
    expect(screen.getByText('a.md')).toBeTruthy()
    expect(screen.getByText('b.md')).toBeTruthy()
  })

  it('calls onSelect with the path when a leaf is clicked', () => {
    const onSelect = vi.fn()
    render(<OpenDocsTree openDocs={['/foo/a.md', '/foo/bar/b.md']} onSelect={onSelect} onClose={() => {}} />)
    fireEvent.click(screen.getByText('a.md'))
    expect(onSelect).toHaveBeenCalledWith('/foo/a.md')
  })

  it('calls onClose with the path when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<OpenDocsTree openDocs={['/foo/a.md', '/foo/bar/b.md']} onSelect={() => {}} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('关闭 a.md'))
    expect(onClose).toHaveBeenCalledWith('/foo/a.md')
  })

  it('does not trigger onSelect when the close button is clicked', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<OpenDocsTree openDocs={['/foo/a.md', '/foo/bar/b.md']} onSelect={onSelect} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('关闭 a.md'))
    expect(onClose).toHaveBeenCalledWith('/foo/a.md')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('marks the active file leaf with the active class', () => {
    render(<OpenDocsTree openDocs={['/foo/a.md', '/foo/bar/b.md']} onSelect={() => {}} onClose={() => {}} />)
    const leaf = screen.getByText('b.md').closest('.file-node')
    expect(leaf?.classList.contains('active')).toBe(true)
  })
})
