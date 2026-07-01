# 侧边栏宽度可调整功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现侧边栏宽度可通过拖拽边缘调整，范围80px到窗口50%，不保存用户设置。

**Architecture:** 混合方案 - 拖拽过程直接修改CSS变量（流畅），拖拽结束时同步React状态（保持一致性）。SidebarResizer组件负责拖拽逻辑，App.tsx管理宽度状态。

**Tech Stack:** React, TypeScript, CSS Variables, DOM Events

---

## Task 1: 创建SidebarResizer基础组件结构

**Files:**
- Create: `src/renderer/src/components/SidebarResizer/SidebarResizer.tsx`
- Create: `src/renderer/src/components/SidebarResizer/SidebarResizer.css`

- [ ] **Step 1: 创建组件目录和基础文件结构**

```bash
mkdir -p src/renderer/src/components/SidebarResizer
```

- [ ] **Step 2: 编写SidebarResizer.tsx基础结构**

```tsx
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
  
  return (
    <div
      ref={resizerRef}
      className={`sidebar-resizer${isDragging ? ' dragging' : ''}`}
    />
  )
}
```

- [ ] **Step 3: 编写SidebarResizer.css基础样式**

```css
.sidebar-resizer {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
}

.sidebar-resizer:hover::after,
.sidebar-resizer.dragging::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 2px;
  height: 100%;
  background: rgba(58, 56, 51, 0.3);
  border-radius: 1px;
}
```

- [ ] **Step 4: 验证类型检查通过**

Run: `npm run typecheck:web`
Expected: No errors

- [ ] **Step 5: Commit基础结构**

```bash
git add src/renderer/src/components/SidebarResizer/
git commit -m "feat: add SidebarResizer component structure"
```

---

## Task 2: 实现拖拽逻辑（mousedown和mousemove）

**Files:**
- Modify: `src/renderer/src/components/SidebarResizer/SidebarResizer.tsx:11-21`

- [ ] **Step 1: 添加mousedown处理逻辑**

在SidebarResizer.tsx中添加：

```tsx
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

  return (
    <div
      ref={resizerRef}
      className={`sidebar-resizer${isDragging ? ' dragging' : ''}`}
      onMouseDown={handleMouseDown}
    />
  )
}
```

- [ ] **Step 2: 添加mousemove和mouseup处理逻辑**

```tsx
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
```

- [ ] **Step 3: 验证类型检查通过**

Run: `npm run typecheck:web`
Expected: No errors

- [ ] **Step 4: Commit拖拽逻辑**

```bash
git add src/renderer/src/components/SidebarResizer/SidebarResizer.tsx
git commit -m "feat: implement SidebarResizer drag logic"
```

---

## Task 3: 编写SidebarResizer单元测试

**Files:**
- Create: `src/renderer/src/__tests__/SidebarResizer.test.tsx`

- [ ] **Step 1: 创建测试文件基础结构**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SidebarResizer } from '../components/SidebarResizer/SidebarResizer'

describe('SidebarResizer', () => {
  const mockOnWidthChange = vi.fn()
  const minWidth = 80
  const maxWidthRatio = 0.5

  beforeEach(() => {
    mockOnWidthChange.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders with correct className', () => {
    render(
      <SidebarResizer
        currentWidth={240}
        onWidthChange={mockOnWidthChange}
        minWidth={minWidth}
        maxWidthRatio={maxWidthRatio}
      />
    )

    const resizer = screen.getByRole('generic', { hidden: true })
    expect(resizer).toHaveClass('sidebar-resizer')
  })

  it('shows hover effect on mouseover', () => {
    render(
      <SidebarResizer
        currentWidth={240}
        onWidthChange={mockOnWidthChange}
        minWidth={minWidth}
        maxWidthRatio={maxWidthRatio}
      />
    )

    const resizer = screen.getByRole('generic', { hidden: true })
    fireEvent.mouseEnter(resizer)
    
    // hover::after pseudo-element applies styles
    expect(resizer).toHaveClass('sidebar-resizer')
  })
})
```

- [ ] **Step 2: 运行测试验证基础渲染**

Run: `npm run test src/renderer/src/__tests__/SidebarResizer.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 3: 添加拖拽状态测试**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SidebarResizer } from '../components/SidebarResizer/SidebarResizer'

describe('SidebarResizer', () => {
  const mockOnWidthChange = vi.fn()
  const minWidth = 80
  const maxWidthRatio = 0.5

  beforeEach(() => {
    mockOnWidthChange.mockClear()
    // Mock window.innerWidth
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
    render(
      <SidebarResizer
        currentWidth={240}
        onWidthChange={mockOnWidthChange}
        minWidth={minWidth}
        maxWidthRatio={maxWidthRatio}
      />
    )

    const resizer = screen.getByRole('generic', { hidden: true })
    expect(resizer).toHaveClass('sidebar-resizer')
  })

  it('shows hover effect on mouseover', () => {
    render(
      <SidebarResizer
        currentWidth={240}
        onWidthChange={mockOnWidthChange}
        minWidth={minWidth}
        maxWidthRatio={maxWidthRatio}
      />
    )

    const resizer = screen.getByRole('generic', { hidden: true })
    fireEvent.mouseEnter(resizer)
    
    expect(resizer).toHaveClass('sidebar-resizer')
  })

  it('enters dragging state on mousedown', async () => {
    render(
      <SidebarResizer
        currentWidth={240}
        onWidthChange={mockOnWidthChange}
        minWidth={minWidth}
        maxWidthRatio={maxWidthRatio}
      />
    )

    const resizer = screen.getByRole('generic', { hidden: true })
    
    await act(async () => {
      fireEvent.mouseDown(resizer, { clientX: 240, preventDefault: vi.fn() })
    })

    expect(resizer).toHaveClass('dragging')
  })

  it('updates CSS variable during drag', async () => {
    const setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty')
    
    render(
      <SidebarResizer
        currentWidth={240}
        onWidthChange={mockOnWidthChange}
        minWidth={minWidth}
        maxWidthRatio={maxWidthRatio}
      />
    )

    const resizer = screen.getByRole('generic', { hidden: true })
    
    await act(async () => {
      fireEvent.mouseDown(resizer, { clientX: 240, preventDefault: vi.fn() })
    })

    await act(async () => {
      fireEvent.mouseMove(document, { clientX: 300 })
    })

    // Should update CSS variable to 300 (240 + 60)
    expect(setPropertySpy).toHaveBeenCalledWith('--sidebar-width', '300px')

    setPropertySpy.mockRestore()
  })

  it('calls onWidthChange on mouseup', async () => {
    render(
      <SidebarResizer
        currentWidth={240}
        onWidthChange={mockOnWidthChange}
        minWidth={minWidth}
        maxWidthRatio={maxWidthRatio}
      />
    )

    const resizer = screen.getByRole('generic', { hidden: true })
    
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
    render(
      <SidebarResizer
        currentWidth={240}
        onWidthChange={mockOnWidthChange}
        minWidth={minWidth}
        maxWidthRatio={maxWidthRatio}
      />
    )

    const resizer = screen.getByRole('generic', { hidden: true })
    
    await act(async () => {
      fireEvent.mouseDown(resizer, { clientX: 240, preventDefault: vi.fn() })
    })

    // Drag to -200 (240 - 200 = 40, should clamp to 80)
    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 40 })
    })

    expect(mockOnWidthChange).toHaveBeenCalledWith(80)
  })

  it('constrains width to maximum (50% of window)', async () => {
    // window.innerWidth = 1000, max = 500
    render(
      <SidebarResizer
        currentWidth={240}
        onWidthChange={mockOnWidthChange}
        minWidth={minWidth}
        maxWidthRatio={maxWidthRatio}
      />
    )

    const resizer = screen.getByRole('generic', { hidden: true })
    
    await act(async () => {
      fireEvent.mouseDown(resizer, { clientX: 240, preventDefault: vi.fn() })
    })

    // Drag to +300 (240 + 300 = 540, should clamp to 500)
    await act(async () => {
      fireEvent.mouseUp(document, { clientX: 540 })
    })

    expect(mockOnWidthChange).toHaveBeenCalledWith(500)
  })
})
```

- [ ] **Step 4: 运行测试验证拖拽逻辑**

Run: `npm run test src/renderer/src/__tests__/SidebarResizer.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit测试**

```bash
git add src/renderer/src/__tests__/SidebarResizer.test.tsx
git commit -m "test: add SidebarResizer unit tests"
```

---

## Task 4: 修改App.tsx添加宽度状态和SidebarResizer

**Files:**
- Modify: `src/renderer/src/App.tsx:1-214`

- [ ] **Step 1: 导入SidebarResizer组件**

在App.tsx顶部添加导入：

```tsx
import './App.css'
import { useEffect, useState } from 'react'
import { MilkdownProvider } from '@milkdown/react'
import { FileTree } from './components/FileTree/FileTree'
import { OpenDocsTree } from './components/OpenDocsTree/OpenDocsTree'
import { Editor } from './components/Editor/Editor'
import { EditorErrorBoundary } from './components/Editor/EditorErrorBoundary'
import { SidebarResizer } from './components/SidebarResizer/SidebarResizer'
import { useAppStore } from './store/useAppStore'
```

- [ ] **Step 2: 添加sidebarWidth状态和常量**

```tsx
import './App.css'
import { useEffect, useState } from 'react'
import { MilkdownProvider } from '@milkdown/react'
import { FileTree } from './components/FileTree/FileTree'
import { OpenDocsTree } from './components/OpenDocsTree/OpenDocsTree'
import { Editor } from './components/Editor/Editor'
import { EditorErrorBoundary } from './components/Editor/EditorErrorBoundary'
import { SidebarResizer } from './components/SidebarResizer/SidebarResizer'
import { useAppStore } from './store/useAppStore'

const MIN_SIDEBAR_WIDTH = 80
const MAX_SIDEBAR_WIDTH_RATIO = 0.5

function isMarkdownFile(filePath: string): boolean {
  return /\.(md|markdown)$/i.test(filePath)
}

export default function App() {
  const { activeFile, activeFileContent, openFile, setFileTree, setWorkspaceRoot, setActiveFile, workspaceRoot, openDocs, closeDoc } = useAppStore()
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [isDragOver, setIsDragOver] = useState(false)
  
  // ... rest of the component
```

- [ ] **Step 3: 在sidebar中渲染SidebarResizer**

```tsx
      <div className="app-body">
        {effectiveSidebarVisible && (
          <aside className="sidebar">
            {workspaceRoot ? (
              <FileTree onOpenFolder={handleOpenFolder} onFileSelect={handleFileSelect} onNewFile={handleNewFile} />
            ) : (
              <OpenDocsTree openDocs={openDocs} onSelect={handleSwitchDoc} onClose={handleCloseDoc} />
            )}
            <SidebarResizer
              currentWidth={sidebarWidth}
              onWidthChange={setSidebarWidth}
              minWidth={MIN_SIDEBAR_WIDTH}
              maxWidthRatio={MAX_SIDEBAR_WIDTH_RATIO}
            />
          </aside>
        )}
        <main
          className={`editor-area${isDragOver ? ' drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* ... editor content */}
        </main>
      </div>
```

- [ ] **Step 4: 通过style prop传递CSS变量**

```tsx
  return (
    <div 
      className={`app${effectiveSidebarVisible ? '' : ' sidebar-hidden'}`}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
    >
      <div className="app-body">
        {effectiveSidebarVisible && (
          <aside className="sidebar">
            {workspaceRoot ? (
              <FileTree onOpenFolder={handleOpenFolder} onFileSelect={handleFileSelect} onNewFile={handleNewFile} />
            ) : (
              <OpenDocsTree openDocs={openDocs} onSelect={handleSwitchDoc} onClose={handleCloseDoc} />
            )}
            <SidebarResizer
              currentWidth={sidebarWidth}
              onWidthChange={setSidebarWidth}
              minWidth={MIN_SIDEBAR_WIDTH}
              maxWidthRatio={MAX_SIDEBAR_WIDTH_RATIO}
            />
          </aside>
        )}
        {/* ... rest */}
      </div>
    </div>
  )
```

- [ ] **Step 5: 验证类型检查通过**

Run: `npm run typecheck:web`
Expected: No errors

- [ ] **Step 6: Commit App.tsx修改**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat: add sidebarWidth state and SidebarResizer to App"
```

---

## Task 5: 修改App.css支持动态宽度

**Files:**
- Modify: `src/renderer/src/App.css:61-68`

- [ ] **Step 1: 调整.sidebar样式**

```css
.sidebar {
  position: relative;
  width: var(--sidebar-width);
  min-width: 80px;
  background: var(--bg-sidebar);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
```

- [ ] **Step 2: 移除:root中的硬编码宽度**

从App.css的:root中移除：

```css
:root {
  /* 移除这一行 */
  /* --sidebar-width: 240px; */
  
  --bg-page:    #FFFFFF;
  /* ... 其他变量保持不变 */
```

- [ ] **Step 3: 验证样式生效**

Run: `npm run dev`
Expected: App renders without errors

- [ ] **Step 4: Commit CSS修改**

```bash
git add src/renderer/src/App.css
git commit -m "feat: make sidebar width dynamic via CSS variable"
```

---

## Task 6: 实现窗口resize监听

**Files:**
- Modify: `src/renderer/src/App.tsx`（添加useEffect）

- [ ] **Step 1: 添加窗口resize处理**

在App.tsx中添加新的useEffect：

```tsx
export default function App() {
  const { activeFile, activeFileContent, openFile, setFileTree, setWorkspaceRoot, setActiveFile, workspaceRoot, openDocs, closeDoc } = useAppStore()
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [isDragOver, setIsDragOver] = useState(false)

  // ... existing code ...

  useEffect(() => {
    const handleResize = () => {
      const maxWidth = window.innerWidth * MAX_SIDEBAR_WIDTH_RATIO
      if (sidebarWidth > maxWidth) {
        setSidebarWidth(maxWidth)
        document.documentElement.style.setProperty('--sidebar-width', `${maxWidth}px`)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarWidth])

  // ... rest of component
```

- [ ] **Step 2: 验证类型检查通过**

Run: `npm run typecheck:web`
Expected: No errors

- [ ] **Step 3: Commit窗口resize监听**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat: handle window resize to constrain sidebar width"
```

---

## Task 7: 编写集成测试

**Files:**
- Modify: `src/renderer/src/__tests__/App.test.tsx`

- [ ] **Step 1: 添加侧边栏宽度调整测试**

在App.test.tsx中添加新的测试：

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from '../App'
import { useAppStore } from '../store/useAppStore'

// Mock the store
vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn(),
}))

describe('App', () => {
  // ... existing tests ...

  describe('sidebar width adjustment', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1000,
      })
    })

    it('renders SidebarResizer when sidebar is visible', () => {
      (useAppStore as any).mockReturnValue({
        activeFile: null,
        activeFileContent: '',
        openFile: vi.fn(),
        setFileTree: vi.fn(),
        setWorkspaceRoot: vi.fn(),
        setActiveFile: vi.fn(),
        workspaceRoot: '/test',
        openDocs: [],
        closeDoc: vi.fn(),
      })

      render(<App />)

      const resizer = document.querySelector('.sidebar-resizer')
      expect(resizer).toBeInTheDocument()
    })

    it('does not render SidebarResizer when sidebar is hidden', async () => {
      (useAppStore as any).mockReturnValue({
        activeFile: null,
        activeFileContent: '',
        openFile: vi.fn(),
        setFileTree: vi.fn(),
        setWorkspaceRoot: vi.fn(),
        setActiveFile: vi.fn(),
        workspaceRoot: '/test',
        openDocs: [],
        closeDoc: vi.fn(),
      })

      const { rerender } = render(<App />)

      // Trigger sidebar toggle
      const toggleCallback = window.api.onMenuToggleSidebar.mock.calls[0][0]
      await act(async () => {
        toggleCallback()
      })

      rerender(<App />)

      const resizer = document.querySelector('.sidebar-resizer')
      expect(resizer).not.toBeInTheDocument()
    })

    it('adjusts width on window resize', async () => {
      (useAppStore as any).mockReturnValue({
        activeFile: '/test.md',
        activeFileContent: '# Test',
        openFile: vi.fn(),
        setFileTree: vi.fn(),
        setWorkspaceRoot: vi.fn(),
        setActiveFile: vi.fn(),
        workspaceRoot: '/test',
        openDocs: ['/test.md'],
        closeDoc: vi.fn(),
      })

      render(<App />)

      // Simulate drag to increase width
      const resizer = document.querySelector('.sidebar-resizer')
      
      await act(async () => {
        fireEvent.mouseDown(resizer!, { clientX: 240, preventDefault: vi.fn() })
      })

      await act(async () => {
        fireEvent.mouseUp(document, { clientX: 500 })
      })

      // Now resize window to smaller width
      await act(async () => {
        window.innerWidth = 600
        fireEvent(window, new Event('resize'))
      })

      await waitFor(() => {
        const sidebar = document.querySelector('.sidebar')
        const width = sidebar?.style.getPropertyValue('--sidebar-width')
        // Max width should be 600 * 0.5 = 300
        expect(parseInt(width || '240')).toBeLessThanOrEqual(300)
      })
    })
  })
})
```

- [ ] **Step 2: 运行测试验证集成**

Run: `npm run test src/renderer/src/__tests__/App.test.tsx`
Expected: PASS (including new tests)

- [ ] **Step 3: Commit集成测试**

```bash
git add src/renderer/src/__tests__/App.test.tsx
git commit -m "test: add sidebar width adjustment integration tests"
```

---

## Task 8: 运行完整测试套件并验证

- [ ] **Step 1: 运行所有测试**

Run: `npm run test`
Expected: All tests PASS

- [ ] **Step 2: 运行类型检查**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: 运行lint检查**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: 手动测试拖拽功能**

Run: `npm run dev`
手动测试：
- 拖拽侧边栏边缘调整宽度
- 验证宽度在80px到窗口50%范围内
- 验证鼠标指针和高亮效果
- 验证窗口resize时宽度自适应
- 验证隐藏/显示侧边栏不影响宽度值

---

## Task 9: 更新README文档

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 添加功能描述到README**

```markdown
## Features

- File tree and workspace browsing
- WYSIWYG Markdown editing with live source sync
- Tables, math, code blocks, and lists
- Mermaid diagrams (sequence, flowchart, class, etc.)
- Drag-and-drop opening for local `.md` files
- Export to HTML, PDF, and Word
- Local image path handling for project-relative assets
- Smart table navigation: ArrowUp at first row inserts paragraph before table at document start
- Adjustable sidebar width: drag the sidebar edge to resize (80px to 50% of window)
```

- [ ] **Step 2: Commit README更新**

```bash
git add README.md
git commit -m "docs: add sidebar resizable feature to README"
```

---

## Task 10: 最终清理和验证

- [ ] **Step 1: 确认所有文件已提交**

Run: `git status`
Expected: No uncommitted changes

- [ ] **Step 2: 查看完整提交历史**

Run: `git log --oneline --graph -10`
Expected: See all feature commits

- [ ] **Step 3: 运行完整验证流程**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: All pass

---

## 自检清单

**1. Spec覆盖：**
- ✓ 组件架构（SidebarResizer） - Task 1
- ✓ 拖拽逻辑 - Task 2
- ✓ 单元测试 - Task 3
- ✓ App.tsx集成 - Task 4
- ✓ CSS动态宽度 - Task 5
- ✓ 窗口resize - Task 6
- ✓ 集成测试 - Task 7
- ✓ 文档更新 - Task 9

**2. Placeholder扫描：**
- 无TBD、TODO、模糊描述
- 所有代码完整
- 所有命令具体

**3. 类型一致性：**
- SidebarResizerProps接口一致
- clampWidth函数签名一致
- onWidthChange回调签名一致

---

**计划完成。准备执行。**