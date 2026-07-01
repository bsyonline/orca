import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SidebarResizer } from '../components/SidebarResizer/SidebarResizer'

describe('SidebarResizer', () => {
  const mockOnWidthChange = vi.fn()
  const minWidth = 80
  const maxWidthRatio = 0.5

  beforeEach(() => {
    mockOnWidthChange.mockClear()
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1000,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders with correct className', () => {
    const { container } = render(
      <SidebarResizer
        currentWidth={240}
        onWidthChange={mockOnWidthChange}
        minWidth={minWidth}
        maxWidthRatio={maxWidthRatio}
      />
    )

    const resizer = container.querySelector('.sidebar-resizer')
    expect(resizer).toBeInTheDocument()
    expect(resizer).toHaveClass('sidebar-resizer')
  })

  it('shows hover effect on mouseover', () => {
    const { container } = render(
      <SidebarResizer
        currentWidth={240}
        onWidthChange={mockOnWidthChange}
        minWidth={minWidth}
        maxWidthRatio={maxWidthRatio}
      />
    )

    const resizer = container.querySelector('.sidebar-resizer')!
    fireEvent.mouseEnter(resizer)
    
    expect(resizer).toHaveClass('sidebar-resizer')
  })

  it('enters dragging state on mousedown', async () => {
    const { container } = render(
      <div className="sidebar" style={{ width: '240px' }}>
        <SidebarResizer
          currentWidth={240}
          onWidthChange={mockOnWidthChange}
          minWidth={minWidth}
          maxWidthRatio={maxWidthRatio}
        />
      </div>
    )

    const resizer = container.querySelector('.sidebar-resizer')!
    
    await act(async () => {
      fireEvent.mouseDown(resizer, { clientX: 240, preventDefault: vi.fn() })
    })

    expect(resizer).toHaveClass('dragging')
  })

  it('updates CSS variable during drag', async () => {
    const setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty')
    
    const { container } = render(
      <div className="sidebar" style={{ width: '240px' }}>
        <SidebarResizer
          currentWidth={240}
          onWidthChange={mockOnWidthChange}
          minWidth={minWidth}
          maxWidthRatio={maxWidthRatio}
        />
      </div>
    )

    const resizer = container.querySelector('.sidebar-resizer')!
    
    await act(async () => {
      fireEvent.mouseDown(resizer, { clientX: 240, preventDefault: vi.fn() })
    })

    await act(async () => {
      fireEvent.mouseMove(document, { clientX: 300 })
    })

    expect(setPropertySpy).toHaveBeenCalledWith('--sidebar-width', '300px')

    setPropertySpy.mockRestore()
  })

  it('moves the dashed preview line with a transform during drag', async () => {
    const { container } = render(
      <div className="sidebar" style={{ width: '240px' }}>
        <SidebarResizer
          currentWidth={240}
          onWidthChange={mockOnWidthChange}
          minWidth={minWidth}
          maxWidthRatio={maxWidthRatio}
        />
      </div>
    )

    const resizer = container.querySelector('.sidebar-resizer')!

    await act(async () => {
      fireEvent.mouseDown(resizer, { clientX: 240, preventDefault: vi.fn() })
    })

    await act(async () => {
      fireEvent.mouseMove(document, { clientX: 327 })
    })

    const previewLine = container.querySelector('.sidebar-resizer-preview')
    expect(previewLine).toBeInTheDocument()
    expect(previewLine).toHaveStyle({ transform: 'translateX(327px)' })
  })

  it('calls onWidthChange on mouseup', async () => {
    const { container } = render(
      <div className="sidebar" style={{ width: '240px' }}>
        <SidebarResizer
          currentWidth={240}
          onWidthChange={mockOnWidthChange}
          minWidth={minWidth}
          maxWidthRatio={maxWidthRatio}
        />
      </div>
    )

    const resizer = container.querySelector('.sidebar-resizer')!
    
    await act(async () => {
      fireEvent.mouseDown(resizer, { clientX: 240, preventDefault: vi.fn() })
    })

    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 300 })
    })

    expect(mockOnWidthChange).toHaveBeenCalledWith(300)
    expect(resizer).not.toHaveClass('dragging')
  })

  it('constrains width to minimum', async () => {
    const { container } = render(
      <div className="sidebar" style={{ width: '240px' }}>
        <SidebarResizer
          currentWidth={240}
          onWidthChange={mockOnWidthChange}
          minWidth={minWidth}
          maxWidthRatio={maxWidthRatio}
        />
      </div>
    )

    const resizer = container.querySelector('.sidebar-resizer')!
    
    await act(async () => {
      fireEvent.mouseDown(resizer, { clientX: 240, preventDefault: vi.fn() })
    })

    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 40 })
    })

    expect(mockOnWidthChange).toHaveBeenCalledWith(80)
  })

  it('constrains width to maximum (50% of window)', async () => {
    const { container } = render(
      <div className="sidebar" style={{ width: '240px' }}>
        <SidebarResizer
          currentWidth={240}
          onWidthChange={mockOnWidthChange}
          minWidth={minWidth}
          maxWidthRatio={maxWidthRatio}
        />
      </div>
    )

    const resizer = container.querySelector('.sidebar-resizer')!
    
    await act(async () => {
      fireEvent.mouseDown(resizer, { clientX: 240, preventDefault: vi.fn() })
    })

    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 540 })
    })

    expect(mockOnWidthChange).toHaveBeenCalledWith(500)
  })
})
