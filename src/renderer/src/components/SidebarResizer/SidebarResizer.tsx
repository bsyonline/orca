import './SidebarResizer.css'
import { useEffect, useRef, useState } from 'react'

interface SidebarResizerProps {
  currentWidth: number
  onWidthChange: (width: number) => void
  minWidth: number
  maxWidthRatio: number
}

export function SidebarResizer({
  currentWidth: _currentWidth,
  onWidthChange: _onWidthChange,
  minWidth: _minWidth,
  maxWidthRatio: _maxWidthRatio,
}: SidebarResizerProps) {
  const [isDragging, _setIsDragging] = useState(false)
  const resizerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Drag logic will be implemented in Task 2
  }, [])
  
  return (
    <div
      ref={resizerRef}
      className={`sidebar-resizer${isDragging ? ' dragging' : ''}`}
    />
  )
}