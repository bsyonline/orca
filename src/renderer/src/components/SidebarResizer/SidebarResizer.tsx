import './SidebarResizer.css'
import { useEffect, useRef, useState } from 'react'

interface SidebarResizerProps {
  currentWidth: number
  onWidthChange: (width: number) => void
  minWidth: number
  maxWidthRatio: number
}

export function SidebarResizer({
  currentWidth,
  onWidthChange,
  minWidth,
  maxWidthRatio,
}: SidebarResizerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragWidth, setDragWidth] = useState(currentWidth)
  const resizerRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    console.log('[SidebarResizer] mousedown triggered', { clientX: e.clientX, currentWidth })
    setIsDragging(true)
    setDragWidth(currentWidth)
    dragStartX.current = e.clientX
    dragStartWidth.current = currentWidth
  }

  useEffect(() => {
    if (!isDragging) return

    const sidebar = resizerRef.current?.closest('.sidebar') as HTMLElement | null
    console.log('[SidebarResizer] useEffect, sidebar element:', sidebar)
    if (!sidebar) {
      console.error('[SidebarResizer] Cannot find .sidebar parent!')
      return
    }

    const getMaxWidth = () => window.innerWidth * maxWidthRatio
    const clampWidth = (width: number) =>
      Math.max(minWidth, Math.min(getMaxWidth(), width))

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX.current
      const newWidth = clampWidth(dragStartWidth.current + deltaX)
      console.log('[SidebarResizer] mousemove', { deltaX, newWidth, clientX: e.clientX })
      setDragWidth(newWidth)
      
      // 直接修改sidebar元素宽度（绕过React）
      sidebar.style.width = `${newWidth}px`
      
      // 同时更新CSS变量（供titlebar等使用）
      document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`)
    }

    const handleMouseUp = (e: MouseEvent) => {
      console.log('[SidebarResizer] mouseup', { clientX: e.clientX })
      setIsDragging(false)
      
      // 计算最终宽度
      const deltaX = e.clientX - dragStartX.current
      const getMaxWidth = () => window.innerWidth * maxWidthRatio
      const clampWidth = (width: number) =>
        Math.max(minWidth, Math.min(getMaxWidth(), width))
      const finalWidth = clampWidth(dragStartWidth.current + deltaX)
      
      // 同步到React状态
      onWidthChange(finalWidth)
      
      // 清除直接style，让React接管
      if (sidebar) {
        sidebar.style.width = ''
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, minWidth, maxWidthRatio, onWidthChange])

  return (
    <div
      ref={resizerRef}
      className={`sidebar-resizer${isDragging ? ' dragging' : ''}`}
      onMouseDown={handleMouseDown}
    >
      {isDragging && (
        <div className="sidebar-width-indicator">
          {Math.round(dragWidth)}px
        </div>
      )}
    </div>
  )
}