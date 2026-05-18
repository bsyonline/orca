import { describe, it, expect } from 'vitest'
import { dataUrlToBase64, getImageExt } from '../lib/imageHandler'

describe('dataUrlToBase64', () => {
  it('extracts base64 payload from data URL', () => {
    expect(dataUrlToBase64('data:image/png;base64,abc123==')).toBe('abc123==')
  })
})

describe('getImageExt', () => {
  it('returns png for image/png', () => { expect(getImageExt('image/png')).toBe('png') })
  it('returns jpg for image/jpeg', () => { expect(getImageExt('image/jpeg')).toBe('jpg') })
  it('returns gif for image/gif', () => { expect(getImageExt('image/gif')).toBe('gif') })
  it('returns webp for image/webp', () => { expect(getImageExt('image/webp')).toBe('webp') })
})
