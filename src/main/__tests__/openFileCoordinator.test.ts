import { describe, expect, it } from 'vitest'
import { createOpenFileCoordinator } from '../openFileCoordinator'

describe('open file coordinator', () => {
  it('queues markdown files until a renderer is ready (cold start)', () => {
    const coordinator = createOpenFileCoordinator()
    const sent: string[] = []

    coordinator.openFile('/docs/from-finder.md', null)

    expect(sent).toEqual([])

    coordinator.markRendererReady(1, (filePath) => sent.push(filePath))

    expect(sent).toEqual(['/docs/from-finder.md'])
  })

  it('sends markdown files immediately to a ready target window', () => {
    const coordinator = createOpenFileCoordinator()
    const sent: string[] = []

    coordinator.markRendererReady(1, (filePath) => sent.push(filePath))
    coordinator.openFile('/docs/next.markdown', 1)

    expect(sent).toEqual(['/docs/next.markdown'])
  })

  it('routes to the targeted window when several are open', () => {
    const coordinator = createOpenFileCoordinator()
    const win1: string[] = []
    const win2: string[] = []

    coordinator.markRendererReady(1, (filePath) => win1.push(filePath))
    coordinator.markRendererReady(2, (filePath) => win2.push(filePath))

    coordinator.openFile('/docs/for-window-2.md', 2)

    expect(win1).toEqual([])
    expect(win2).toEqual(['/docs/for-window-2.md'])
  })

  it('stops sending to a window once it is cleared', () => {
    const coordinator = createOpenFileCoordinator()
    const sent: string[] = []

    coordinator.markRendererReady(1, (filePath) => sent.push(filePath))
    coordinator.clearRenderer(1)
    // No ready target anymore -> the file is queued, not sent to the dead window.
    coordinator.openFile('/docs/orphan.md', 1)

    expect(sent).toEqual([])
  })

  it('ignores non-markdown files', () => {
    const coordinator = createOpenFileCoordinator()
    const sent: string[] = []

    coordinator.openFile('/docs/image.png', null)
    coordinator.markRendererReady(1, (filePath) => sent.push(filePath))

    expect(sent).toEqual([])
  })
})
