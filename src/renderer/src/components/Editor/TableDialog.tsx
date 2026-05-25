import './TableDialog.css'
import { useState, useEffect, useRef } from 'react'

interface TableDialogProps {
  onConfirm: (rows: number, cols: number) => void
  onCancel: () => void
  defaultRows?: number
  defaultCols?: number
}

export function TableDialog({
  onConfirm,
  onCancel,
  defaultRows = 3,
  defaultCols = 3,
}: TableDialogProps) {
  const [rows, setRows] = useState(defaultRows)
  const [cols, setCols] = useState(defaultCols)
  const [error, setError] = useState<string | null>(null)
  const rowsInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    rowsInputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    if (rows < 1 || rows > 10) {
      setError('行数必须在 1-10 之间')
      return
    }
    if (cols < 1 || cols > 10) {
      setError('列数必须在 1-10 之间')
      return
    }
    setError(null)
    onConfirm(rows, cols)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="table-dialog-overlay" onClick={onCancel}>
      <div className="table-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <h3>插入表格</h3>
        <div className="table-dialog-inputs">
          <label>
            行数：
            <input
              ref={rowsInputRef}
              type="number"
              min={1}
              max={10}
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value) || 1)}
            />
          </label>
          <label>
            列数：
            <input
              type="number"
              min={1}
              max={10}
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value) || 1)}
            />
          </label>
        </div>
        {error && <div className="table-dialog-error">{error}</div>}
        <div className="table-dialog-buttons">
          <button className="table-dialog-cancel" onClick={onCancel}>
            取消
          </button>
          <button className="table-dialog-confirm" onClick={handleSubmit}>
            确定
          </button>
        </div>
      </div>
    </div>
  )
}