import './TableEdgeButtons.css'
import { useEffect, useRef, useCallback } from 'react'
import { callCommand } from '@milkdown/kit/utils'
import { addRowAfterCommand, addColAfterCommand } from '@milkdown/kit/preset/gfm'
import { editorViewCtx } from '@milkdown/kit/core'
import { TextSelection } from '@milkdown/kit/prose/state'
import { deleteRow, deleteColumn } from '@milkdown/prose/tables'

interface TableEdgeButtonsProps {
  editorRef: React.RefObject<HTMLDivElement>
  getInstance: ReturnType<typeof import('@milkdown/react').useInstance>[1]
}

export function TableEdgeButtons({ editorRef, getInstance }: TableEdgeButtonsProps) {
  const tablesRef = useRef<Set<HTMLElement>>(new Set())
  const overlaysRef = useRef<Map<HTMLElement, HTMLElement>>(new Map())
  const observersRef = useRef<Map<HTMLElement, MutationObserver>>(new Map())
  const buttonControllersRef = useRef<Map<HTMLElement, AbortController>>(new Map())

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
        if (node.type.name === 'table') { tableNodePos = $tablePos.before(d); break }
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
            if (c < colIndex) { cellPos += cellNode.nodeSize } else { cellPos += 1 }
          }
        }
      }
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, cellPos)))
    })
    return true
  }, [getInstance])

  const handleAddRow = useCallback((table: HTMLElement, rowIndex: number) => {
    if (!setSelectionToCell(table, rowIndex, 0)) return
    getInstance()?.action(callCommand(addRowAfterCommand.key))
  }, [getInstance, setSelectionToCell])

  const handleAddCol = useCallback((table: HTMLElement, colIndex: number) => {
    if (!setSelectionToCell(table, 0, colIndex)) return
    getInstance()?.action(callCommand(addColAfterCommand.key))
  }, [getInstance, setSelectionToCell])

  const handleDeleteRow = useCallback((table: HTMLElement, rowIndex: number) => {
    if (!setSelectionToCell(table, rowIndex, 0)) return
    getInstance()?.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      if (view) deleteRow(view.state, view.dispatch)
    })
  }, [getInstance, setSelectionToCell])

  const handleDeleteCol = useCallback((table: HTMLElement, colIndex: number) => {
    if (!setSelectionToCell(table, 0, colIndex)) return
    getInstance()?.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      if (view) deleteColumn(view.state, view.dispatch)
    })
  }, [getInstance, setSelectionToCell])

  const positionOverlay = useCallback((table: HTMLElement, overlay: HTMLElement) => {
    const editor = editorRef.current
    if (!editor) return
    const tableRect = table.getBoundingClientRect()
    const editorRect = editor.getBoundingClientRect()
    overlay.style.top = `${tableRect.top - editorRect.top + editor.scrollTop}px`
    overlay.style.left = `${tableRect.left - editorRect.left}px`
    overlay.style.width = `${tableRect.width}px`
    overlay.style.height = `${tableRect.height}px`
  }, [editorRef])

  const updateButtons = useCallback((table: HTMLElement, overlay: HTMLElement) => {
    buttonControllersRef.current.get(table)?.abort()
    const ac = new AbortController()
    buttonControllersRef.current.set(table, ac)
    const { signal } = ac

    overlay.innerHTML = ''

    const rows = table.querySelectorAll('tr')
    const rowCount = rows.length
    const firstRowCells = rows[0]?.querySelectorAll('td, th') || []
    const colCount = firstRowCells.length
    const tableRect = table.getBoundingClientRect()

    // Build row buttons
    type BtnPair = { add: HTMLButtonElement; del: HTMLButtonElement }
    const rowBtns: BtnPair[] = []
    rows.forEach((row, rowIndex) => {
      const rowRect = (row as HTMLElement).getBoundingClientRect()
      const rowTop = rowRect.top - tableRect.top
      const rowBottom = rowRect.bottom - tableRect.top

      const addBtn = document.createElement('button')
      addBtn.type = 'button'
      addBtn.className = 'table-edge-btn table-add-row-btn'
      addBtn.textContent = '+'
      addBtn.style.top = `${rowBottom - 10}px`
      addBtn.style.opacity = '0'
      addBtn.addEventListener('click', (e) => { e.preventDefault(); handleAddRow(table, rowIndex) })
      overlay.appendChild(addBtn)

      const delBtn = document.createElement('button')
      delBtn.type = 'button'
      delBtn.className = 'table-edge-btn table-delete-btn table-delete-row-btn'
      delBtn.textContent = '−'
      delBtn.style.top = `${rowTop + (rowBottom - rowTop) / 2 - 10}px`
      delBtn.style.opacity = '0'
      if (rowCount <= 1) delBtn.classList.add('table-edge-btn-disabled')
      delBtn.addEventListener('click', (e) => { e.preventDefault(); if (rowCount > 1) handleDeleteRow(table, rowIndex) })
      overlay.appendChild(delBtn)

      rowBtns.push({ add: addBtn, del: delBtn })
    })

    // Build col buttons
    const colBtns: BtnPair[] = []
    firstRowCells.forEach((cell, colIndex) => {
      const cellRect = (cell as HTMLElement).getBoundingClientRect()
      const colLeft = cellRect.left - tableRect.left
      const colRight = cellRect.right - tableRect.left

      const addBtn = document.createElement('button')
      addBtn.type = 'button'
      addBtn.className = 'table-edge-btn table-add-col-btn'
      addBtn.textContent = '+'
      addBtn.style.left = `${colRight - 10}px`
      addBtn.style.opacity = '0'
      addBtn.addEventListener('click', (e) => { e.preventDefault(); handleAddCol(table, colIndex) })
      overlay.appendChild(addBtn)

      const delBtn = document.createElement('button')
      delBtn.type = 'button'
      delBtn.className = 'table-edge-btn table-delete-btn table-delete-col-btn'
      delBtn.textContent = '−'
      delBtn.style.left = `${colLeft + (colRight - colLeft) / 2 - 10}px`
      delBtn.style.opacity = '0'
      if (colCount <= 1) delBtn.classList.add('table-edge-btn-disabled')
      delBtn.addEventListener('click', (e) => { e.preventDefault(); if (colCount > 1) handleDeleteCol(table, colIndex) })
      overlay.appendChild(delBtn)

      colBtns.push({ add: addBtn, del: delBtn })
    })

    // Coordinate-based hover: use mousemove on <table> so ProseMirror <tr> replacements don't break it
    let activeRow = -1
    let activeCol = -1
    let hideTimer: ReturnType<typeof setTimeout> | null = null

    const setRow = (i: number) => {
      if (i === activeRow) return
      activeRow = i
      rowBtns.forEach(({ add, del }, idx) => {
        add.style.opacity = idx === i ? '1' : '0'
        del.style.opacity = idx === i && rowCount > 1 ? '1' : '0'
      })
    }
    const setCol = (i: number) => {
      if (i === activeCol) return
      activeCol = i
      colBtns.forEach(({ add, del }, idx) => {
        add.style.opacity = idx === i ? '1' : '0'
        del.style.opacity = idx === i && colCount > 1 ? '1' : '0'
      })
    }
    const hideAll = () => {
      if (hideTimer) clearTimeout(hideTimer)
      hideTimer = setTimeout(() => {
        activeRow = -1; activeCol = -1
        rowBtns.forEach(({ add, del }) => { add.style.opacity = '0'; del.style.opacity = '0' })
        colBtns.forEach(({ add, del }) => { add.style.opacity = '0'; del.style.opacity = '0' })
        hideTimer = null
      }, 80)
    }
    const cancelHide = () => { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null } }

    table.addEventListener('mousemove', (e) => {
      cancelHide()
      // Detect row by Y coordinate
      let row = -1
      table.querySelectorAll('tr').forEach((tr, i) => {
        const r = (tr as HTMLElement).getBoundingClientRect()
        if (e.clientY >= r.top && e.clientY <= r.bottom) row = i
      })
      // Detect col by X coordinate using first row cells
      let col = -1
      const cells = table.querySelectorAll('tr')[0]?.querySelectorAll('td, th') || []
      cells.forEach((td, i) => {
        const r = (td as HTMLElement).getBoundingClientRect()
        if (e.clientX >= r.left && e.clientX <= r.right) col = i
      })
      setRow(row)
      setCol(col)
    }, { signal })

    table.addEventListener('mouseleave', hideAll, { signal })

    // Keep buttons visible when cursor moves from table edge to button
    rowBtns.forEach(({ add, del }) => {
      add.addEventListener('mouseenter', cancelHide)
      del.addEventListener('mouseenter', cancelHide)
      add.addEventListener('mouseleave', hideAll)
      del.addEventListener('mouseleave', hideAll)
    })
    colBtns.forEach(({ add, del }) => {
      add.addEventListener('mouseenter', cancelHide)
      del.addEventListener('mouseenter', cancelHide)
      add.addEventListener('mouseleave', hideAll)
      del.addEventListener('mouseleave', hideAll)
    })
  }, [handleAddRow, handleAddCol, handleDeleteRow, handleDeleteCol])

  const attachTable = useCallback((table: HTMLElement) => {
    if (tablesRef.current.has(table)) return
    tablesRef.current.add(table)

    const editor = editorRef.current
    if (!editor) return

    const overlay = document.createElement('div')
    overlay.className = 'table-edge-overlay'
    editor.appendChild(overlay)
    overlaysRef.current.set(table, overlay)

    positionOverlay(table, overlay)
    updateButtons(table, overlay)

    // Per-table structural observer — only rebuilds on row/col additions/removals
    const STRUCTURAL_TAGS = new Set(['TR', 'TD', 'TH', 'TBODY', 'THEAD'])
    const observer = new MutationObserver((mutations) => {
      const isStructural = mutations.some((m) =>
        m.type === 'childList' &&
        [...m.addedNodes, ...m.removedNodes].some(
          (n) => n instanceof HTMLElement && STRUCTURAL_TAGS.has(n.tagName)
        )
      )
      if (isStructural) setTimeout(() => {
        positionOverlay(table, overlay)
        updateButtons(table, overlay)
      }, 100)
    })
    observer.observe(table, { childList: true, subtree: true })
    observersRef.current.set(table, observer)
  }, [editorRef, positionOverlay, updateButtons])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    let processing = false
    const processTables = () => {
      if (processing) return
      processing = true
      setTimeout(() => {
        // Clean up overlays for tables no longer in the editor
        tablesRef.current.forEach((table) => {
          if (!editor.contains(table)) {
            observersRef.current.get(table)?.disconnect()
            observersRef.current.delete(table)
            buttonControllersRef.current.get(table)?.abort()
            buttonControllersRef.current.delete(table)
            const overlay = overlaysRef.current.get(table)
            overlay?.parentNode?.removeChild(overlay)
            overlaysRef.current.delete(table)
            tablesRef.current.delete(table)
          } else {
            const overlay = overlaysRef.current.get(table)
            if (overlay) positionOverlay(table, overlay)
          }
        })
        // Attach new tables
        editor.querySelectorAll('table').forEach((table) => {
          if (!tablesRef.current.has(table as HTMLElement)) {
            attachTable(table as HTMLElement)
          }
        })
        processing = false
      }, 50)
    }

    processTables()
    const t1 = setTimeout(processTables, 200)
    const t2 = setTimeout(processTables, 600)
    const t3 = setTimeout(processTables, 1500)

    const editorObserver = new MutationObserver(processTables)
    editorObserver.observe(editor, { childList: true, subtree: true })

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      editorObserver.disconnect()
      observersRef.current.forEach((obs) => obs.disconnect())
      observersRef.current.clear()
      buttonControllersRef.current.forEach((ac) => ac.abort())
      buttonControllersRef.current.clear()
      overlaysRef.current.forEach((overlay) => overlay.parentNode?.removeChild(overlay))
      overlaysRef.current.clear()
      tablesRef.current.clear()
    }
  }, [editorRef, attachTable])

  return null
}
