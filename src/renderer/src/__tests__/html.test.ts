import { describe, it, expect } from 'vitest'
import { buildHTMLDocument } from '../lib/exporters/html'

describe('buildHTMLDocument', () => {
  it('produces a valid HTML document', async () => {
    const result = await buildHTMLDocument('Hello', 'My Doc')
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).toContain('Hello')
  })

  it('sets the document title', async () => {
    const result = await buildHTMLDocument('x', 'My Title')
    expect(result).toContain('<title>My Title</title>')
  })

  it('inlines CSS styles', async () => {
    const result = await buildHTMLDocument('text', 'Doc')
    expect(result).toContain('<style>')
    expect(result).toContain('font-family')
  })

  it('escapes HTML characters in the title', async () => {
    const result = await buildHTMLDocument('x', '<script>')
    expect(result).toContain('&lt;script&gt;')
    expect(result).not.toContain('<title><script>')
  })
})