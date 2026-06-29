import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  // Remounting the boundary (via key) after a file switch clears a stale error.
  onReset?: () => void
}

interface State {
  error: Error | null
}

// Milkdown's editor lifecycle is async and racy (StrictMode/HMR can recreate the
// instance, and ctx.get throws when a context isn't injected yet). Without a
// boundary, any such throw unmounts the entire React tree and the app goes blank.
// This contains the failure to the editor area instead.
export class EditorErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Editor crashed:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="editor-error">
          <p>编辑器加载出错，请重试或重新打开文件。</p>
          <button onClick={() => this.setState({ error: null })}>重试</button>
        </div>
      )
    }
    return this.props.children
  }
}
