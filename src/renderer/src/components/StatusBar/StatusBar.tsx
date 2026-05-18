import './StatusBar.css'
import { useAppStore } from '../../store/useAppStore'
import { basename } from '../../lib/pathUtils'

export function StatusBar() {
  const { activeFile, isDirty } = useAppStore()
  const filename = activeFile ? basename(activeFile) : null

  return (
    <div className="statusbar">
      {filename && (
        <>
          {isDirty && <span className="dirty">●</span>}
          <span className="filename">{filename}</span>
        </>
      )}
    </div>
  )
}
