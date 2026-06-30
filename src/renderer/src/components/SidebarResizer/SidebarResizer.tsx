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
  const resizerRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartWidth.current = currentWidth
  }

  useEffect(() => {
    if (!isDragging) return

    const getMaxWidth = () => window.innerWidth * maxWidthRatio
    const clampWidth = (width: number) =>
      Math.max(minWidth, Math.min(getMaxWidth(), width))

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX.current
      const newWidth = clampWidth(dragStartWidth.current + deltaX)
      
      // 直接修改CSS变量（不触发渲染）
      document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`)
    }

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false)
      
      // 计算最终宽度
      const deltaX = e.clientX - dragStartX.current
      const getMaxWidth = () => window.innerWidth * maxWidthRatio
      const clampWidth = (width: number) =>
        Math.max(minWidth, Math.min(getMaxWidth(), width))
      const finalWidth = clampWidth(dragStartWidth.current + deltaX)
      
      // 同步到React状态
      onWidthChange(finalWidth)
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
    />
  )
}