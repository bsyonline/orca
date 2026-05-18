import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBar } from '../components/StatusBar/StatusBar'
import { useAppStore } from '../store/useAppStore'

describe('StatusBar', () => {
  it('shows filename when a file is active', () => {
    useAppStore.setState({ activeFile: '/docs/note.md', isDirty: false })
    render(<StatusBar />)
    expect(screen.getByText('note.md')).toBeInTheDocument()
  })

  it('shows dirty dot when isDirty is true', () => {
    useAppStore.setState({ activeFile: '/docs/note.md', isDirty: true })
    render(<StatusBar />)
    expect(screen.getByText('●')).toBeInTheDocument()
  })

  it('renders no filename element when no file is active', () => {
    useAppStore.setState({ activeFile: null, isDirty: false })
    const { container } = render(<StatusBar />)
    expect(container.querySelector('.filename')).toBeNull()
  })
})
