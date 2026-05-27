import './TableEdgeButtons.css'
import { useEffect, useRef, useCallback } from 'react'
import { callCommand } from '@milkdown/kit/utils'
import { addRowAfterCommand, addColAfterCommand, deleteSelectedCellsCommand } from '@milkdown/kit/preset/gfm'
import { editorViewCtx } from '@milkdown/kit/core'
import { TextSelection } from '@milkdown/kit/prose/state'

interface TableEdgeButtonsProps {
  editorRef: React.RefObject<HTMLDivElement>
  getInstance: ReturnType<typeof import('@milkdown/react').useInstance>[1]
}

export function TableEdgeButtons({ editorRef, getInstance }: TableEdgeButtonsProps) {
  const tablesRef = useRef<Set<HTMLElement>>(new Set())
  const buttonsRef = useRef<Map<HTMLElement, HTMLElement>>(new Map())
  const observersRef = useRef<Map<HTMLElement, MutationObserver>>(new Map())
  const abortControllersRef = useRef<Map<HTMLElement, AbortController>>(new Map())

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

  const handleDeleteRow = useCallback((table: HTMLElement, rowIndex: number) => {
    if (!setSelectionToCell(table, rowIndex, 0)) return
    const instance = getInstance()
    if (!instance) return
    instance.action(callCommand(deleteSelectedCellsCommand.key))
  }, [getInstance, setSelectionToCell])

  const handleDeleteCol = useCallback((table: HTMLElement, colIndex: number) => {
    if (!setSelectionToCell(table, 0, colIndex)) return
    const instance = getInstance()
    if (!instance) return
    instance.action(callCommand(deleteSelectedCellsCommand.key))
  }, [getInstance, setSelectionToCell])

  const updateButtons = useCallback((table: HTMLElement, container: HTMLElement) => {
    // 中止并替换上一轮的 hover 事件监听器
    abortControllersRef.current.get(table)?.abort()
    const ac = new AbortController()
    abortControllersRef.current.set(table, ac)
    const { signal } = ac

    container.innerHTML = ''

    const rows = table.querySelectorAll('tr')
    const rowCount = rows.length
    const firstRowCells = rows[0]?.querySelectorAll('td, th') || []
    const colCount = firstRowCells.length

    rows.forEach((row, rowIndex) => {
      const rowEl = row as HTMLElement

      // 右侧"+"添加行按钮（现有逻辑）
      const addRowBtn = document.createElement('button')
      addRowBtn.className = 'table-edge-btn table-add-row-btn'
      addRowBtn.textContent = '+'
      addRowBtn.style.top = `${rowEl.offsetTop + rowEl.offsetHeight / 2 - 10}px`
      addRowBtn.addEventListener('click', (e) => {
        e.preventDefault()
        handleAddRow(table, rowIndex)
      })
      container.appendChild(addRowBtn)

      // 左侧"−"删除行按钮（新增）
      const delRowBtn = document.createElement('button')
      delRowBtn.className = 'table-edge-btn table-delete-btn table-delete-row-btn'
      delRowBtn.textContent = '−'
      delRowBtn.style.top = `${rowEl.offsetTop + rowEl.offsetHeight / 2 - 10}px`
      if (rowCount <= 1) {
        delRowBtn.classList.add('table-edge-btn-disabled')
      }
      delRowBtn.addEventListener('click', (e) => {
        e.preventDefault()
        if (rowCount > 1) handleDeleteRow(table, rowIndex)
      })
      container.appendChild(delRowBtn)

      rowEl.addEventListener('mouseenter', () => { delRowBtn.style.opacity = '1' }, { signal })
      rowEl.addEventListener('mouseleave', () => { delRowBtn.style.opacity = '0' }, { signal })
    })

    firstRowCells.forEach((cell, colIndex) => {
      const cellEl = cell as HTMLElement

      // 底部"+"添加列按钮（现有逻辑）
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

      // 顶部"−"删除列按钮（新增）
      const delColBtn = document.createElement('button')
      delColBtn.className = 'table-edge-btn table-delete-btn table-delete-col-btn'
      delColBtn.textContent = '−'
      delColBtn.style.left = `${cellEl.offsetLeft + cellEl.offsetWidth / 2 - 10}px`
      if (colCount <= 1) {
        delColBtn.classList.add('table-edge-btn-disabled')
      }
      delColBtn.addEventListener('click', (e) => {
        e.preventDefault()
        if (colCount > 1) handleDeleteCol(table, colIndex)
      })
      container.appendChild(delColBtn)

      cellEl.addEventListener('mouseenter', () => { delColBtn.style.opacity = '1' }, { signal })
      cellEl.addEventListener('mouseleave', () => { delColBtn.style.opacity = '0' }, { signal })
    })
  }, [handleAddRow, handleAddCol, handleDeleteRow, handleDeleteCol])

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

    const observer = new MutationObserver(() => {
      setTimeout(() => updateButtons(table, buttonsContainer), 100)
    })
    observer.observe(table, { childList: true, subtree: true })
    observersRef.current.set(table, observer)
  }, [updateButtons])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    let processing = false
    const processTables = () => {
      if (processing) return
      processing = true
      setTimeout(() => {
        const tables = editor.querySelectorAll('table:not(.table-edge-container table)')
        tables.forEach((table) => {
          if (!tablesRef.current.has(table as HTMLElement)) {
            wrapTable(table as HTMLElement)
          }
        })
        processing = false
      }, 50)
    }

    processTables()

    const editorObserver = new MutationObserver(() => {
      processTables()
    })
    editorObserver.observe(editor, { childList: true, subtree: true })

    return () => {
      editorObserver.disconnect()
      observersRef.current.forEach((observer) => observer.disconnect())
      observersRef.current.clear()
      abortControllersRef.current.forEach((ac) => ac.abort())
      abortControllersRef.current.clear()
    }
  }, [editorRef, wrapTable])

  return null
}