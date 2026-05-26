import { transformImagePath, restoreImagePath } from '../lib/transformImagePath'
import { describe, it, expect } from 'vitest'

describe('transformImagePath', () => {
  it('transforms relative paths to oraca-img protocol', () => {
    const markdown = '![](./img/test.png)'
    const mdFilePath = '/Users/user/docs/note.md'
    const result = transformImagePath(markdown, mdFilePath)
    expect(result).toBe('![](oraca-img:///Users/user/docs/img/test.png)')
  })

  it('handles ../ paths', () => {
    const markdown = '![](../assets/image.png)'
    const mdFilePath = '/Users/user/docs/subdir/note.md'
    const result = transformImagePath(markdown, mdFilePath)
    expect(result).toBe('![](oraca-img:///Users/user/docs/assets/image.png)')
  })

  it('does not transform http URLs', () => {
    const markdown = '![](https://example.com/image.png)'
    const mdFilePath = '/Users/user/docs/note.md'
    const result = transformImagePath(markdown, mdFilePath)
    expect(result).toBe('![](https://example.com/image.png)')
  })

  it('does not transform data URLs', () => {
    const markdown = '![](data:image/png;base64,abc)'
    const mdFilePath = '/Users/user/docs/note.md'
    const result = transformImagePath(markdown, mdFilePath)
    expect(result).toBe('![](data:image/png;base64,abc)')
  })

  it('preserves alt text', () => {
    const markdown = '![封面](./img/cover.png)'
    const mdFilePath = '/Users/user/docs/note.md'
    const result = transformImagePath(markdown, mdFilePath)
    expect(result).toBe('![封面](oraca-img:///Users/user/docs/img/cover.png)')
  })
})

describe('restoreImagePath', () => {
  it('restores oraca-img paths to relative paths', () => {
    const markdown = '![](oraca-img:///Users/user/docs/img/test.png)'
    const mdFilePath = '/Users/user/docs/note.md'
    const result = restoreImagePath(markdown, mdFilePath)
    expect(result).toBe('![](./img/test.png)')
  })

  it('handles ../ restoration', () => {
    const markdown = '![](oraca-img:///Users/user/docs/assets/image.png)'
    const mdFilePath = '/Users/user/docs/subdir/note.md'
    const result = restoreImagePath(markdown, mdFilePath)
    expect(result).toBe('![](../assets/image.png)')
  })

  it('preserves alt text', () => {
    const markdown = '![封面](oraca-img:///Users/user/docs/img/cover.png)'
    const mdFilePath = '/Users/user/docs/note.md'
    const result = restoreImagePath(markdown, mdFilePath)
    expect(result).toBe('![封面](./img/cover.png)')
  })
})

describe('transform and restore cycle', () => {
  it('preserves original relative path after cycle', () => {
    const original = '![](./img/test.png)'
    const mdFilePath = '/Users/user/docs/note.md'
    const transformed = transformImagePath(original, mdFilePath)
    const restored = restoreImagePath(transformed, mdFilePath)
    expect(restored).toBe(original)
  })

  it('preserves ../ paths after cycle', () => {
    const original = '![](../assets/image.png)'
    const mdFilePath = '/Users/user/docs/subdir/note.md'
    const transformed = transformImagePath(original, mdFilePath)
    const restored = restoreImagePath(transformed, mdFilePath)
    expect(restored).toBe(original)
  })
})