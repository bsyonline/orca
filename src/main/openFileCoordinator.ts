type SendOpenFile = (filePath: string) => void

function isMarkdownFile(filePath: string): boolean {
  return /\.(md|markdown)$/i.test(filePath)
}

export function createOpenFileCoordinator() {
  // Files that arrived before any renderer was ready (cold start). Drained to
  // the first renderer that becomes ready.
  const pendingOpenFiles: string[] = []
  // Ready renderers keyed by their webContents id, so an "open with" request can
  // be routed to a specific (focused) window instead of one shared target.
  const senders = new Map<number, SendOpenFile>()

  return {
    openFile(filePath: string, targetId?: number | null): boolean {
      if (!isMarkdownFile(filePath)) return false

      const sender = targetId != null ? senders.get(targetId) : undefined
      if (sender) {
        sender(filePath)
      } else {
        // No ready target window yet (cold start, or the target is still
        // loading) — queue until a renderer signals ready.
        pendingOpenFiles.push(filePath)
      }

      return true
    },

    markRendererReady(id: number, sender: SendOpenFile): void {
      senders.set(id, sender)

      while (pendingOpenFiles.length > 0) {
        const filePath = pendingOpenFiles.shift()
        if (filePath) sender(filePath)
      }
    },

    clearRenderer(id: number): void {
      senders.delete(id)
    },
  }
}
