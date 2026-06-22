type SendOpenFile = (filePath: string) => void

function isMarkdownFile(filePath: string): boolean {
  return /\.(md|markdown)$/i.test(filePath)
}

export function createOpenFileCoordinator() {
  const pendingOpenFiles: string[] = []
  let sendOpenFile: SendOpenFile | null = null

  return {
    openFile(filePath: string): boolean {
      if (!isMarkdownFile(filePath)) return false

      if (sendOpenFile) {
        sendOpenFile(filePath)
      } else {
        pendingOpenFiles.push(filePath)
      }

      return true
    },

    markRendererReady(sender: SendOpenFile): void {
      sendOpenFile = sender

      while (pendingOpenFiles.length > 0) {
        const filePath = pendingOpenFiles.shift()
        if (filePath) sender(filePath)
      }
    },

    clearRenderer(sender: SendOpenFile): void {
      if (sendOpenFile === sender) sendOpenFile = null
    },
  }
}
