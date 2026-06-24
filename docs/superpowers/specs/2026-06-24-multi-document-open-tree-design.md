# 多文档打开与路径树切换 — 设计文档

日期：2026-06-24

## 目标

支持同时打开多个文档。打开文档 A 后再打开文档 B 时，左侧边栏显示一个按路径分组的树形菜单，列出所有已打开的文档；点击任意条目即可在它们之间切换。

## 背景与现状

当前应用在 zustand store 中只跟踪单个文档：`activeFile` / `activeFileContent`。打开一个文件会替换上一个。侧边栏有两种状态：

- **文件夹模式**（`workspaceRoot !== null`）：显示工作区文件夹树 `FileTree`。
- **单文件模式**（`workspaceRoot === null`）：侧边栏隐藏。

关键既有机制：`Editor` 在卸载时会把待写入的防抖编辑刷盘（`Editor.tsx:75-87`），且 `App.tsx` 用 `activeFile` 作为 `MilkdownProvider` 的 `key`，因此切换文档时上一个编辑器会先卸载并刷盘，再挂载新文档。

## 范围内决策

- 菜单结构：**按路径树形分组**。折叠最长公共目录前缀作为顶层分组，其余部分嵌套展开。
- 显示位置：**仅在单文件模式显示**。文件夹模式仍用原有 `FileTree`，互不干扰。
- 管理能力：
  - 可关闭单个文档（从列表移除，不删除磁盘文件）。
  - 当打开文档减少到只剩 1 个时，自动隐藏侧边栏，回到干净的单文档编辑状态。

## 不在范围内（YAGNI）

- 重启后恢复上次打开的文档（持久化）。
- 文件夹模式下同时显示“打开文档”树。
- 拖拽重新排序。

## 架构

内容管理采用 **磁盘为唯一真相来源** 的方案：store 只跟踪“已打开路径列表”，仅当前活动文档的内容驻留在 `activeFileContent`。切换到某文档时从磁盘重新读取其内容。该方案可行，因为编辑器已在卸载时刷盘，切换会重建 `MilkdownProvider`，故离开的文档总是先写盘再加载新文档。相比在内存中按文档缓存内容，此方案新增状态最少，且无内容与防抖磁盘写入不一致的风险。

### 1. Store（`useAppStore.ts`）

- 新增 `openDocs: string[]` —— 有序的已打开文件路径列表。
- `openFile(path, content)` —— 若 `path` 不在 `openDocs` 中则追加（去重），随后照旧设置 `activeFile` / `activeFileContent`、`isDirty = false`。
- 新增 `closeDoc(path): string | null` —— 从 `openDocs` 移除 `path`；返回应成为新活动文档的路径（优先前一个相邻项，否则后一个，否则 `null`）。它只修改列表，不做文件 IO（文件 IO 留在渲染层）。

### 2. 路径树构建器（`lib/buildOpenDocsTree.ts`）

纯函数，便于单元测试：`string[] → 树节点`。

- 折叠最长公共目录前缀为顶层分组，其余部分逐级嵌套。
- 例：`/foo/a.md` + `/foo/bar/b.md` → `foo › a.md` 和 `foo › bar › b.md`。
- 叶子节点携带完整路径；目录节点为分组标签。
- 基于既有 `basename` / `dirname`（`lib/pathUtils.ts`），需正确处理 Windows 风格分隔符（`pathUtils` 已统一将 `\\` 归一为 `/`）。

建议节点形状：

```ts
type OpenDocTreeNode =
  | { type: 'directory'; name: string; children: OpenDocTreeNode[] }
  | { type: 'file'; name: string; path: string }
```

### 3. `OpenDocsTree` 组件（新建 `components/OpenDocsTree/`）

- 渲染该树，复用既有的 chevron / file SVG 图标与 `.file-node` 样式，与工作区树视觉一致。
- 目录可折叠（默认展开）。
- 活动叶子节点应用 `active` 高亮。
- 每个叶子在 hover 时显示 `×`；点击 `×` → `onClose(path)`，点击叶子 → `onSelect(path)`。

接口：

```ts
interface OpenDocsTreeProps {
  openDocs: string[]
  onSelect: (path: string) => void
  onClose: (path: string) => void
}
```

### 4. `App.tsx` 接线

- 侧边栏内容按模式区分：文件夹模式（`workspaceRoot !== null`）渲染 `FileTree`；单文件模式（`workspaceRoot === null`）渲染 `OpenDocsTree`。其余侧边栏切换行为不变。
- 当单文件模式下 `openDocs.length >= 2` 时显示侧边栏；当关闭使其回落到 1 时隐藏侧边栏。
- `onSelect(path)`：`readFile` → `openFile(path, content)`（从磁盘重读）。
- `closeDoc(path)`：调用 store 的 `closeDoc`；若返回的下一个路径与当前活动文档不同，则 `readFile` + `openFile` 加载它；若 `openDocs` 长度已变为 1，则隐藏侧边栏。
- 更新既有打开处理逻辑（`onOpenFile`、菜单打开）：打开第 2 个文档时显示侧边栏，而非强制隐藏。

## 数据流

打开 A → `openDocs = [A]`，单文档，无侧边栏。打开 B → `openDocs = [A, B]`，显示侧边栏树。点击树中某叶子 → 读盘 + `openFile` → `MilkdownProvider` key 变化 → 旧编辑器卸载刷盘、新编辑器挂载。

## 边界情况

- 关闭活动文档：激活相邻文档并加载它。
- 关闭后台（非活动）文档：活动文档不变。
- 打开已打开的路径：仅重新激活，不产生重复条目。
- 仅剩 1 个文档：不显示侧边栏。

## 测试

- `buildOpenDocsTree` 单元测试：单文件、公共前缀折叠、完全发散的路径、Windows 风格分隔符。
- 扩展 `OpenDocumentSwitch.test.tsx`：
  - 打开 2 个文档后树出现；
  - 点击叶子切换活动文档并重建 provider；
  - 点击 `×` 移除文档；回落到 1 个文档时隐藏侧边栏。

测试命令：`npm test`（vitest）。
