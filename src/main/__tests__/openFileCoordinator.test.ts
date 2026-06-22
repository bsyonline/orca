import { describe, expect, it } from 'vitest'
import { createOpenFileCoordinator } from '../openFileCoordinator'

describe('open file coordinator', () => {
  it('queues markdown files until the renderer is ready', () => {
    const coordinator = createOpenFileCoordinator()
    const sent: string[] = []

    coordinator.openFile('/docs/from-finder.md')

    expect(sent).toEqual([])

    coordinator.markRendererReady((filePath) => sent.push(filePath))

    expect(sent).toEqual(['/docs/from-finder.md'])
  })

  it('sends markdown files immediately after the renderer is ready', () => {
    const coordinator = createOpenFileCoordinator()
    const sent: string[] = []

    coordinator.markRendererReady((filePath) => sent.push(filePath))
    coordinator.openFile('/docs/next.markdown')

    expect(sent).toEqual(['/docs/next.markdown'])
  })

  it('ignores non-markdown files', () => {
    const coordinator = createOpenFileCoordinator()
    const sent: string[] = []

    coordinator.openFile('/docs/image.png')
    coordinator.markRendererReady((filePath) => sent.push(filePath))

    expect(sent).toEqual([])
  })
})
