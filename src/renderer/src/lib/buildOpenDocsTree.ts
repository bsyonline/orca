export type OpenDocTreeNode =
  | { type: 'directory'; name: string; children: OpenDocTreeNode[] }
  | { type: 'file'; name: string; path: string }

interface SplitPath {
  /** Directory segments, e.g. ['foo', 'bar']. */
  dirs: string[]
  /** File name, e.g. 'b.md'. */
  file: string
  /** Original, un-normalized path used as the leaf identity. */
  original: string
}

function splitPath(path: string): SplitPath {
  const segments = path.replace(/\\/g, '/').split('/').filter((s) => s.length > 0)
  const file = segments.pop() ?? path
  return { dirs: segments, file, original: path }
}

/**
 * Number of leading directory segments shared by every path. Used to collapse a
 * common ancestor into the top-level group instead of showing empty wrappers.
 */
function commonDirDepth(items: SplitPath[]): number {
  if (items.length === 0) return 0
  const first = items[0].dirs
  let depth = 0
  for (let i = 0; i < first.length; i++) {
    if (items.every((it) => it.dirs[i] === first[i])) depth++
    else break
  }
  return depth
}

/** Recursively build nodes from directory segments at `depth` downward. */
function buildLevel(items: SplitPath[], depth: number): OpenDocTreeNode[] {
  const files: OpenDocTreeNode[] = []
  const groups = new Map<string, SplitPath[]>()

  for (const item of items) {
    if (depth >= item.dirs.length) {
      files.push({ type: 'file', name: item.file, path: item.original })
    } else {
      const key = item.dirs[depth]
      const bucket = groups.get(key)
      if (bucket) bucket.push(item)
      else groups.set(key, [item])
    }
  }

  const dirs: OpenDocTreeNode[] = []
  for (const [name, bucket] of groups) {
    dirs.push({ type: 'directory', name, children: buildLevel(bucket, depth + 1) })
  }

  // Files first, then sub-directories, preserving insertion order within each.
  return [...files, ...dirs]
}

export function buildOpenDocsTree(paths: string[]): OpenDocTreeNode[] {
  if (paths.length === 0) return []
  const items = paths.map(splitPath)

  // A single open doc shows as a bare file (no wrapping group).
  if (items.length === 1) {
    return [{ type: 'file', name: items[0].file, path: items[0].original }]
  }

  const depth = commonDirDepth(items)
  const children = buildLevel(items, depth)

  // No shared ancestor → multiple top-level groups (divergent paths).
  if (depth === 0) return children

  // Collapse the shared ancestor into a single root group labeled by the
  // joined common prefix (e.g. 'foo' or 'C:/docs').
  const rootName = items[0].dirs.slice(0, depth).join('/')
  return [{ type: 'directory', name: rootName, children }]
}
