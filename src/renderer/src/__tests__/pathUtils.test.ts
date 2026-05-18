import { describe, it, expect } from 'vitest'
import { basename, dirname } from '../lib/pathUtils'

describe('basename', () => {
  it('returns filename from Unix path', () => {
    expect(basename('/Users/me/docs/note.md')).toBe('note.md')
  })

  it('strips extension when provided', () => {
    expect(basename('/docs/note.md', '.md')).toBe('note')
  })

  it('handles filename with no directory', () => {
    expect(basename('note.md')).toBe('note.md')
  })
})

describe('dirname', () => {
  it('returns directory portion of file path', () => {
    expect(dirname('/Users/me/docs/note.md')).toBe('/Users/me/docs')
  })

  it('returns empty string for root-level path', () => {
    expect(dirname('/note.md')).toBe('')
  })
})
