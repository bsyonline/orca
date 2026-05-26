import './TableEdgeButtons.css'
import { useEffect, useRef, useCallback } from 'react'
import { callCommand } from '@milkdown/kit/utils'
import { addRowAfterCommand, addColAfterCommand } from '@milkdown/kit/preset/gfm'
import { editorViewCtx } from '@milkdown/kit/core'
import { TextSelection } from '@milkdown/kit/prose/state'

interface TableEdgeButtonsProps {
  editorRef: React.RefObject<HTMLDivElement>
  getInstance: ReturnType<typeof import('@milkdown/react').useInstance>[1]
}

export function TableEdgeButtons({ editorRef, getInstance }: TableEdgeButtonsProps) {
  const tablesRef = useRef<Set<HTMLElement>>(new Set())
  const buttonsRef = useRef<Map<HTMLElement, HTMLElement>>(new Map())

  const setSelectionToCell = useCallback((table: HTMLElement, rowIndex: number, colIndex: number) => {
    const instance = getInstance()
    if (!instance) return false

    instance.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      if (!view) return
      
      const tablePos = view.posAtDOM(table, 0)
      if (tablePos < 0) return

      const $tablePos = view.state.doc.resolve(tablePos)
      let tableNodePos = -1
      for (let d = $tablePos.depth; d >= 0; d--) {
        const node = $tablePos.node(d)
        if (node.type.name === 'table') {
          tableNodePos = $tablePos.before(d)
          break
        }
      }
      if (tableNodePos < 0) return

      const tableNode = view.state.doc.nodeAt(tableNodePos)
      if (!tableNode) return

      let cellPos = tableNodePos + 1
      for (let r = 0; r <= rowIndex && r < tableNode.childCount; r++) {
        const rowNode = tableNode.child(r)
        if (r < rowIndex) {
          cellPos += rowNode.nodeSize
        } else {
          cellPos += 1
          for (let c = 0; c <= colIndex && c < rowNode.childCount; c++) {
            const cellNode = rowNode.child(c)
            if (c < colIndex) {
              cellPos += cellNode.nodeSize
            } else {
              cellPos += 1
            }
          }
        }
      }

      const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, cellPos))
      view.dispatch(tr)
    })
    return true
  }, [getInstance])

  const handleAddRow = useCallback((table: HTMLElement, rowIndex: number) => {
    if (!setSelectionToCell(table, rowIndex, 0)) return
    const instance = getInstance()
    if (!instance) return
    instance.action(callCommand(addRowAfterCommand.key))
  }, [getInstance, setSelectionToCell])

  const handleAddCol = useCallback((table: HTMLElement, colIndex: number) => {
    if (!setSelectionToCell(table, 0, colIndex)) return
    const instance = getInstance()
    if (!instance) return
    instance.action(callCommand(addColAfterCommand.key))
  }, [getInstance, setSelectionToCell])

  const updateButtons = useCallback((table: HTMLElement, container: HTMLElement) => {
    container.innerHTML = ''

    const rows = table.querySelectorAll('tr')
    rows.forEach((row, rowIndex) => {
      const addRowBtn = document.createElement('button')
      addRowBtn.className = 'table-edge-btn table-add-row-btn'
      addRowBtn.textContent = '+'
      addRowBtn.style.top = `${row.offsetTop + row.offsetHeight / 2 - 10}px`
      addRowBtn.addEventListener('click', (e) => {
        e.preventDefault()
        handleAddRow(table, rowIndex)
      })
      container.appendChild(addRowBtn)
    })

    const firstRowCells = rows[0]?.querySelectorAll('td, th') || []
    firstRowCells.forEach((cell, colIndex) => {
      const cellEl = cell as HTMLElement
      const addColBtn = document.createElement('button')
      addColBtn.className = 'table-edge-btn table-add-col-btn'
      addColBtn.textContent = '+'
      addColBtn.style.left = `${cellEl.offsetLeft + cellEl.offsetWidth / 2 - 10}px`
      addColBtn.style.transform = 'none'
      addColBtn.addEventListener('click', (e) => {
        e.preventDefault()
        handleAddCol(table, colIndex)
      })
      container.appendChild(addColBtn)
    })
  }, [handleAddRow, handleAddCol])

  const wrapTable = useCallback((table: HTMLElement) => {
    if (tablesRef.current.has(table)) return
    tablesRef.current.add(table)

    const container = document.createElement('div')
    container.className = 'table-edge-container'
    table.parentNode?.insertBefore(container, table)
    container.appendChild(table)

    const buttonsContainer = document.createElement('div')
    buttonsContainer.className = 'table-edge-buttons'
    container.appendChild(buttonsContainer)
    buttonsRef.current.set(table, buttonsContainer)

    updateButtons(table, buttonsContainer)
  }, [updateButtons])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const existingTables = editor.querySelectorAll('table')
    existingTables.forEach(wrapTable)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              if ((node as HTMLElement).classList.contains('table-edge-container')) {
                return
              }
              if (node.tagName === 'TABLE') {
                wrapTable(node)
              } else {
                const tables = node.querySelectorAll('table')
                tables.forEach(wrapTable)
              }
            }
          })
        }
      }
    })

    observer.observe(editor, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [editorRef, wrapTable])

  return null
}