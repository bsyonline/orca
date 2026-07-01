# 侧边栏宽度可调整功能设计

## 需求背景

用户需要调整侧边栏宽度，主要用于：
1. 显示更长的文件名
2. 在小屏幕上获得更多编辑器空间

当前侧边栏宽度固定为 240px，无法根据用户需求动态调整。

## 功能需求

### 宽度范围
- **最小宽度**：80px（当前240px的1/3）
- **最大宽度**：窗口宽度的50%
- **默认宽度**：240px
- **宽度保存**：不保存用户设置，每次打开应用恢复默认240px

### 交互方式
- **调整方式**：拖拽侧边栏右边缘
- **视觉反馈**：
  - 鼠标悬停边缘时显示 `col-resize` 指针
  - 边缘显示高亮条（2px宽度，半透明背景色）
- **双击恢复**：可选功能，暂不实现

## 实现方案

采用混合方案（方案3）：拖拽过程直接修改CSS变量（不触发渲染），拖拽结束时同步到React状态（用于标题栏等依赖）。

### 组件架构

**新增组件：SidebarResizer**

位置：`src/renderer/src/components/SidebarResizer/`

```
src/renderer/src/components/
├── SidebarResizer/
│   ├── SidebarResizer.tsx    # 拖拽逻辑组件
│   └── SidebarResizer.css    # 拖拽手柄样式
```

**组件职责分工：**
- `SidebarResizer`：负责拖拽逻辑、宽度约束、视觉反馈
- `App.tsx`：添加 `sidebarWidth` 状态，管理宽度值
- `App.css`：将 `--sidebar-width` CSS变量改为动态设置

**渲染位置：**

SidebarResizer 作为 `.sidebar` 的最后一个子元素：

```tsx
<aside className="sidebar">
  {workspaceRoot ? <FileTree ... /> : <OpenDocsTree ... />}
  <SidebarResizer onWidthChange={setSidebarWidth} ... />
</aside>
```

### 交互流程

**状态机：**
```
idle → hover → dragging → drag-end → idle
```

**详细流程：**

1. **idle → hover**
   - 鼠标进入侧边栏右边缘区域（4px宽的可拖拽区域）
   - 鼠标指针变为 `col-resize`
   - 边缘显示高亮条（2px宽度，半透明背景色）

2. **hover → dragging**
   - 用户按下鼠标左键
   - 阻止默认拖拽行为
   - 设置 `dragging` 状态为 true
   - 记录初始鼠标X坐标和初始宽度

3. **dragging**
   - 监听 `mousemove`，计算 `deltaX = currentX - initialX`
   - **直接修改CSS变量**：`document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px')`
   - 不触发 React 状态更新（保持流畅）
   - 应用宽度约束：`Math.max(minWidth, Math.min(maxWidth, newWidth))`

4. **dragging → drag-end**
   - 鼠标释放或离开窗口
   - 清除 `mousemove` 监听器
   - **同步到 React 状态**：调用 `onWidthChange(finalWidth)`
   - 清除 `dragging` 状态
   - 移除边缘高亮效果

5. **drag-end → idle**
   - 等待下次 hover

### 数据流

**状态管理：**

```tsx
// App.tsx
const [sidebarWidth, setSidebarWidth] = useState(240)
```

**宽度约束函数：**

```tsx
const MIN_WIDTH = 80
const MAX_WIDTH_RATIO = 0.5

const getMaxWidth = () => window.innerWidth * MAX_WIDTH_RATIO
const clampWidth = (width: number) => 
  Math.max(MIN_WIDTH, Math.min(getMaxWidth(), width))
```

**宽度传递：**

```tsx
// App.tsx
<SidebarResizer 
  currentWidth={sidebarWidth}
  onWidthChange={setSidebarWidth}
  minWidth={MIN_WIDTH}
  maxWidthRatio={MAX_WIDTH_RATIO}
/>
```

**更新路径：**
- **初始化**：App.tsx 渲染时，通过 `style` 设置 CSS 变量
- **拖拽过程**：SidebarResizer 直接操作 DOM
- **拖拽结束**：SidebarResizer 调用 `setSidebarWidth(newValue)`
- **标题栏依赖**：`sidebarWidth` 状态更新时，App.tsx 自动重新渲染，标题栏位置正确调整

### 边界情况处理

1. **窗口resize**
   - 监听 `window.resize` 事件
   - 检查当前宽度是否超出新的最大值
   - 如果超出，立即调整到新的最大值
   - 更新 React 状态和 CSS 变量

2. **侧边栏隐藏/显示**
   - 隐藏时宽度值保持不变
   - 显示时恢复之前的宽度
   - SidebarResizer 在侧边栏隐藏时不渲染

3. **拖拽到极限值**
   - 拖拽到最小值时，宽度不再减小，但鼠标可以继续移动
   - 拖拽到最大值时同理
   - 视觉反馈保持

4. **快速拖拽出窗口**
   - 使用 `document.addEventListener` 监听事件
   - `mouseleave` 或 `mouseup` 在窗口外触发时，正确结束拖拽
   - 清理所有监听器，避免内存泄漏

### 视觉设计

**拖拽手柄样式：**

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

**侧边栏调整：**

```css
.sidebar {
  position: relative;  /* 为 SidebarResizer 提定位基准 */
  width: var(--sidebar-width);
  min-width: 80px;
}
```

**动画过渡：**
- 拖拽过程：无动画（直接修改，保证流畅）
- 窗口resize调整：平滑过渡动画

### 测试策略

**单元测试：**

1. 宽度约束函数测试
   - 测试 `clampWidth` 在各种输入下的输出
   - 测试最小边界、最大边界、中间值
   - 测试窗口宽度变化时最大值动态调整

2. SidebarResizer 组件测试
   - 测试鼠标 hover 触发高亮效果
   - 测试鼠标按下进入 dragging 状态
   - 测试拖拽过程中 CSS 变量被正确修改
   - 测试鼠标释放时调用 `onWidthChange`
   - 测试拖拽到极限值时宽度不再变化

**集成测试：**

1. App + SidebarResizer 集成
   - 测试拖拽结束后 `sidebarWidth` 状态正确更新
   - 测试侧边栏隐藏时 SidebarResizer 不渲染
   - 测试显示侧边栏后恢复之前的宽度

2. 窗口resize 测试
   - 模拟窗口缩小，验证宽度自动调整
   - 模拟窗口放大，验证宽度保持不变（除非超出）

**手动测试场景：**
- 不同屏幕尺寸下的拖拽体验
- 快速拖拽、慢速拖拽的流畅度
- 隐藏/显示侧边栏后宽度记忆
- 窗口resize时的宽度自适应

## 实现影响

**修改的文件：**
- `src/renderer/src/App.tsx`：添加状态，修改布局
- `src/renderer/src/App.css`：调整 CSS 变量使用方式
- 新增 `src/renderer/src/components/SidebarResizer/`

**依赖的现有功能：**
- `sidebarVisible` 状态（已有）
- `.sidebar` CSS 样式（已有）
- `--sidebar-width` CSS 变量（已有）

**向后兼容：**
- 不破坏现有功能
- 默认宽度保持240px
- 隐藏/显示功能保持不变

## 成功标准

1. 用户可以通过拖拽边缘调整侧边栏宽度
2. 宽度在80px到窗口50%范围内平滑变化
3. 拖拽流畅，无卡顿
4. 视觉反馈清晰（指针变化、边缘高亮）
5. 窗口resize时宽度自适应
6. 侧边栏隐藏/显示不影响宽度值
7. 所有测试通过