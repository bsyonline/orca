import { describe, it, expect } from 'vitest'
import { buildOpenDocsTree } from '../buildOpenDocsTree'

describe('buildOpenDocsTree', () => {
  it('returns a single file node for one path', () => {
    expect(buildOpenDocsTree(['/foo/a.md'])).toEqual([
      { type: 'file', name: 'a.md', path: '/foo/a.md' },
    ])
  })

  it('collapses the common directory prefix into a top group', () => {
    expect(buildOpenDocsTree(['/foo/a.md', '/foo/bar/b.md'])).toEqual([
      {
        type: 'directory',
        name: 'foo',
        children: [
          { type: 'file', name: 'a.md', path: '/foo/a.md' },
          {
            type: 'directory',
            name: 'bar',
            children: [{ type: 'file', name: 'b.md', path: '/foo/bar/b.md' }],
          },
        ],
      },
    ])
  })

  it('handles fully divergent paths with no common prefix', () => {
    const tree = buildOpenDocsTree(['/foo/a.md', '/bar/b.md'])
    expect(tree).toEqual([
      {
        type: 'directory',
        name: 'foo',
        children: [{ type: 'file', name: 'a.md', path: '/foo/a.md' }],
      },
      {
        type: 'directory',
        name: 'bar',
        children: [{ type: 'file', name: 'b.md', path: '/bar/b.md' }],
      },
    ])
  })

  it('normalizes Windows-style separators and joins the common prefix', () => {
    expect(buildOpenDocsTree(['C:\\docs\\a.md', 'C:\\docs\\sub\\b.md'])).toEqual([
      {
        type: 'directory',
        name: 'C:/docs',
        children: [
          { type: 'file', name: 'a.md', path: 'C:\\docs\\a.md' },
          {
            type: 'directory',
            name: 'sub',
            children: [{ type: 'file', name: 'b.md', path: 'C:\\docs\\sub\\b.md' }],
          },
        ],
      },
    ])
  })

  it('returns an empty array for no paths', () => {
    expect(buildOpenDocsTree([])).toEqual([])
  })
})
