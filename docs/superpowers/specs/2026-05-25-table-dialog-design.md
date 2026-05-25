# 表格插入对话框设计文档

## 背景

当前插入表格功能硬编码为 3 行 3 列，用户无法自定义行列数。

**问题位置：** `src/renderer/src/components/Editor/Editor.tsx:138`

```typescript
case 'table': exec(insertTableCommand.key, { row: 3, col: 3 }); break
```

## 目标

添加对话框让用户在插入表格前指定行列数。

## 功能需求

- 输入行数和列数
- 默认值：3 行 × 3 列
- 范围限制：最小 1，最大 10
- 验证非法输入并提示
- 确定/取消操作

## 技术方案

采用自定义 React 模态框组件（方案 A）。

### 组件结构

```
src/renderer/src/components/Editor/
├── Editor.tsx          (修改)
├── Editor.css          (修改)
├── TableDialog.tsx     (新增)
└── TableDialog.css     (新增)
```

### TableDialog.tsx

**Props：**
- `onConfirm(rows: number, cols: number): void` - 确定回调
- `onCancel(): void` - 取消回调
- `defaultRows: number` - 默认行数（默认 3）
- `defaultCols: number` - 默认列数（默认 3）

**内部状态：**
- `rows: number` - 当前行数输入
- `cols: number` - 当前列数输入
- `error: string | null` - 验证错误提示

**UI 元素：**
- 行数输入框（type="number"，min=1，max=10）
- 列数输入框（type="number"，min=1，max=10）
- 确定按钮
- 取消按钮
- 错误提示区域（红色文字）

### Editor.tsx 修改

**新增 state：**
- `showTableDialog: boolean` - 控制对话框显示

**修改逻辑：**
- 点击"插入表格"时设置 `showTableDialog = true`
- 新增 `handleTableConfirm(rows, cols)` 函数执行 `insertTableCommand`
- 对话框关闭后设置 `showTableDialog = false`

### 数据流

```
用户点击"插入表格"
  → Editor.tsx: showDialog=true
  → TableDialog 显示（默认 3×3）
  → 用户输入行列数
  → 点击确定
  → TableDialog 验证（1-10）
    → 合法：调用 onConfirm(rows, cols)
    → 非法：显示错误提示
  → Editor.tsx 执行 insertTableCommand
  → 关闭对话框
```

### 交互细节

- **默认值：** 行=3，列=3
- **输入类型：** 数字输入框
- **验证时机：** 点击"确定"时
- **非法输入处理：** 显示红色提示文字，阻止插入
- **快捷键：**
  - Enter = 确定
  - Escape = 取消

### 样式

`TableDialog.css` 包含：
- 模态框容器：居中、半透明背景遮罩
- 内容框：白色背景、圆角、阴影
- 输入框：统一宽度、间距
- 按钮：确定主色调、取消次要样式
- 错误提示：红色文字

## 验收标准

1. 点击"插入表格"显示对话框
2. 默认显示 3×3
3. 输入有效值（1-10）并确定，正确插入对应表格
4. 输入无效值（如 0 或 11）显示错误提示，不插入
5. 点击取消或按 Escape 关闭对话框，不插入表格
6. 按 Enter 快速确定

## 影响范围

- 新增 2 个文件
- 修改 Editor.tsx 约 10 行
- 修改 Editor.css 添加少量样式引用