import { describe, it, expect } from 'vitest'
import { buildHTMLDocument } from '../lib/exporters/html'

describe('buildHTMLDocument', () => {
  it('produces a valid HTML document', () => {
    const result = buildHTMLDocument('<p>Hello</p>', 'My Doc')
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).toContain('<p>Hello</p>')
  })

  it('sets the document title', () => {
    const result = buildHTMLDocument('<p>x</p>', 'My Title')
    expect(result).toContain('<title>My Title</title>')
  })

  it('inlines CSS styles', () => {
    const result = buildHTMLDocument('<p>text</p>', 'Doc')
    expect(result).toContain('<style>')
    expect(result).toContain('font-family')
  })

  it('escapes HTML characters in the title', () => {
    const result = buildHTMLDocument('<p>x</p>', '<script>')
    expect(result).toContain('&lt;script&gt;')
    expect(result).not.toContain('<title><script>')
  })
})
