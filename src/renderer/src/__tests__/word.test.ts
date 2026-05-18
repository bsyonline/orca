import { describe, it, expect } from 'vitest'
import { markdownToDocxBuffer } from '../lib/exporters/word'

describe('markdownToDocxBuffer', () => {
  it('returns a non-empty Uint8Array', async () => {
    const buffer = await markdownToDocxBuffer('# Hello\n\nParagraph text.')
    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('handles empty markdown without throwing', async () => {
    const buffer = await markdownToDocxBuffer('')
    expect(buffer).toBeInstanceOf(Uint8Array)
  })

  it('handles multiple heading levels', async () => {
    const buffer = await markdownToDocxBuffer('# H1\n## H2\n### H3\n\nParagraph.')
    expect(buffer.length).toBeGreaterThan(0)
  })
})
