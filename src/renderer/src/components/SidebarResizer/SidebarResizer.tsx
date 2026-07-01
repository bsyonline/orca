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
  const [startWidth, setStartWidth] = useState(currentWidth)
  const resizerRef = useRef<HTMLDivElement>(null)
  const previewLineRef = useRef<HTMLDivElement>(null)
  const widthIndicatorRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef(0)
  const dragWidthRef = useRef(currentWidth)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setStartWidth(currentWidth)
    dragStartX.current = e.clientX
    dragWidthRef.current = currentWidth
  }

  useEffect(() => {
    if (!isDragging) return

    const sidebar = document.querySelector('.sidebar') as HTMLElement | null
    if (!sidebar) {
      setIsDragging(false)
      return
    }

    const getMaxWidth = () => window.innerWidth * maxWidthRatio
    const clampWidth = (width: number) =>
      Math.max(minWidth, Math.min(getMaxWidth(), width))

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX.current
      const newWidth = clampWidth(startWidth + deltaX)
      dragWidthRef.current = newWidth
      
      // 直接修改sidebar元素宽度（绕过React）
      sidebar.style.width = `${newWidth}px`
      if (previewLineRef.current) {
        previewLineRef.current.style.transform = `translateX(${newWidth}px)`
      }
      if (widthIndicatorRef.current) {
        widthIndicatorRef.current.textContent = `${Math.round(newWidth)}px`
      }
      
      // 同时更新CSS变量（供titlebar等使用）
      document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`)
    }

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false)
      
      // 计算最终宽度
      const deltaX = e.clientX - dragStartX.current
      const getMaxWidth = () => window.innerWidth * maxWidthRatio
      const clampWidth = (width: number) =>
        Math.max(minWidth, Math.min(getMaxWidth(), width))
      const finalWidth = clampWidth(startWidth + deltaX)
      
      // 同步到React状态
      onWidthChange(finalWidth)
      
      // 清除直接style，让React接管
      sidebar.style.width = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, minWidth, maxWidthRatio, onWidthChange, startWidth])

  return (
    <>
      <div
        ref={resizerRef}
        className={`sidebar-resizer${isDragging ? ' dragging' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="sidebar-resizer-line" />
        {isDragging && (
          <div ref={widthIndicatorRef} className="sidebar-width-indicator">
            {Math.round(currentWidth)}px
          </div>
        )}
      </div>
      {isDragging && (
        <>
          <div
            ref={previewLineRef}
            className="sidebar-resizer-preview"
            style={{ transform: `translateX(${currentWidth}px)` }}
          />
          <div
            className="sidebar-resizer-original"
            style={{ left: `${startWidth}px` }}
          />
        </>
      )}
    </>
  )
}
