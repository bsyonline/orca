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
  const [rows, setRows] = useState(String(defaultRows))
  const [cols, setCols] = useState(String(defaultCols))
  const [error, setError] = useState<string | null>(null)
  const rowsInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    rowsInputRef.current?.focus()
    rowsInputRef.current?.select()
  }, [])

  const handleSubmit = () => {
    const rowsNum = parseInt(rows)
    const colsNum = parseInt(cols)

    if (!rows || rowsNum < 1 || rowsNum > 10) {
      setError('行数超出范围，请输入1-10')
      return
    }
    if (!cols || colsNum < 1 || colsNum > 10) {
      setError('列数超出范围，请输入1-10')
      return
    }
    setError(null)
    onConfirm(rowsNum, colsNum)
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
      <div className="table-dialog" role="dialog" aria-modal="true" aria-labelledby="table-dialog-title" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <h3 id="table-dialog-title">插入表格</h3>
        <div className="table-dialog-inputs">
          <label>
            行数：
            <input
              ref={rowsInputRef}
              type="number"
              min={1}
              max={10}
              value={rows}
              onChange={(e) => setRows(e.target.value)}
            />
          </label>
          <label>
            列数：
            <input
              type="number"
              min={1}
              max={10}
              value={cols}
              onChange={(e) => setCols(e.target.value)}
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