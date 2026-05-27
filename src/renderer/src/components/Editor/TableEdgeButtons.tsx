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
  const overlaysRef = useRef<Map<HTMLElement, HTMLElement>>(new Map())
  const observersRef = useRef<Map<HTMLElement, MutationObserver>>(new Map())
  const buttonControllersRef = useRef<Map<HTMLElement, AbortController>>(new Map())
  const hoverControllersRef = useRef<Map<HTMLElement, AbortController>>(new Map())
  const hideTimersRef = useRef<Map<HTMLElement, ReturnType<typeof setTimeout>>>(new Map())

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
    getInstance()?.action(callCommand(deleteSelectedCellsCommand.key))
  }, [getInstance, setSelectionToCell])

  const handleDeleteCol = useCallback((table: HTMLElement, colIndex: number) => {
    if (!setSelectionToCell(table, 0, colIndex)) return
    getInstance()?.action(callCommand(deleteSelectedCellsCommand.key))
  }, [getInstance, setSelectionToCell])

  // Position overlay to exactly cover the table (no DOM move)
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

    rows.forEach((row, rowIndex) => {
      const rowEl = row as HTMLElement

      const addRowBtn = document.createElement('button')
      addRowBtn.className = 'table-edge-btn table-add-row-btn'
      addRowBtn.textContent = '+'
      addRowBtn.style.top = `${rowEl.offsetTop + rowEl.offsetHeight / 2 - 10}px`
      addRowBtn.addEventListener('click', (e) => { e.preventDefault(); handleAddRow(table, rowIndex) })
      overlay.appendChild(addRowBtn)

      const delRowBtn = document.createElement('button')
      delRowBtn.className = 'table-edge-btn table-delete-btn table-delete-row-btn'
      delRowBtn.textContent = '−'
      delRowBtn.style.top = `${rowEl.offsetTop + rowEl.offsetHeight / 2 - 10}px`
      if (rowCount <= 1) delRowBtn.classList.add('table-edge-btn-disabled')
      delRowBtn.addEventListener('click', (e) => { e.preventDefault(); if (rowCount > 1) handleDeleteRow(table, rowIndex) })
      overlay.appendChild(delRowBtn)

      rowEl.addEventListener('mouseenter', () => { delRowBtn.style.opacity = '1' }, { signal })
      rowEl.addEventListener('mouseleave', () => { delRowBtn.style.opacity = '0' }, { signal })
    })

    firstRowCells.forEach((cell, colIndex) => {
      const cellEl = cell as HTMLElement

      const addColBtn = document.createElement('button')
      addColBtn.className = 'table-edge-btn table-add-col-btn'
      addColBtn.textContent = '+'
      addColBtn.style.left = `${cellEl.offsetLeft + cellEl.offsetWidth / 2 - 10}px`
      addColBtn.style.transform = 'none'
      addColBtn.addEventListener('click', (e) => { e.preventDefault(); handleAddCol(table, colIndex) })
      overlay.appendChild(addColBtn)

      const delColBtn = document.createElement('button')
      delColBtn.className = 'table-edge-btn table-delete-btn table-delete-col-btn'
      delColBtn.textContent = '−'
      delColBtn.style.left = `${cellEl.offsetLeft + cellEl.offsetWidth / 2 - 10}px`
      if (colCount <= 1) delColBtn.classList.add('table-edge-btn-disabled')
      delColBtn.addEventListener('click', (e) => { e.preventDefault(); if (colCount > 1) handleDeleteCol(table, colIndex) })
      overlay.appendChild(delColBtn)

      cellEl.addEventListener('mouseenter', () => { delColBtn.style.opacity = '1' }, { signal })
      cellEl.addEventListener('mouseleave', () => { delColBtn.style.opacity = '0' }, { signal })
    })
  }, [handleAddRow, handleAddCol, handleDeleteRow, handleDeleteCol])

  const attachTable = useCallback((table: HTMLElement) => {
    if (tablesRef.current.has(table)) return
    tablesRef.current.add(table)

    const editor = editorRef.current
    if (!editor) return

    // Create overlay as child of editor (never touch ProseMirror's table node)
    const overlay = document.createElement('div')
    overlay.className = 'table-edge-overlay'
    editor.appendChild(overlay)
    overlaysRef.current.set(table, overlay)

    positionOverlay(table, overlay)
    updateButtons(table, overlay)

    // Hover show/hide with delay so mouse can reach buttons outside table bounds
    const hac = new AbortController()
    hoverControllersRef.current.set(table, hac)

    const cancelHide = () => {
      const t = hideTimersRef.current.get(table)
      if (t != null) { clearTimeout(t); hideTimersRef.current.delete(table) }
    }
    const scheduleHide = () => {
      cancelHide()
      hideTimersRef.current.set(table, setTimeout(() => {
        overlay.style.opacity = '0'
        hideTimersRef.current.delete(table)
      }, 300))
    }

    table.addEventListener('mouseenter', () => { cancelHide(); overlay.style.opacity = '1' }, { signal: hac.signal })
    table.addEventListener('mouseleave', scheduleHide, { signal: hac.signal })
    // Keep overlay visible when hovering buttons
    overlay.addEventListener('mouseenter', cancelHide)
    overlay.addEventListener('mouseleave', scheduleHide)

    // Per-table structural observer (only rebuilds on row/col additions/removals)
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
            hoverControllersRef.current.get(table)?.abort()
            hoverControllersRef.current.delete(table)
            const t = hideTimersRef.current.get(table)
            if (t != null) { clearTimeout(t); hideTimersRef.current.delete(table) }
            const overlay = overlaysRef.current.get(table)
            overlay?.parentNode?.removeChild(overlay)
            overlaysRef.current.delete(table)
            tablesRef.current.delete(table)
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

    const editorObserver = new MutationObserver((mutations) => {
      const hasTableChange = mutations.some((m) =>
        m.type === 'childList' &&
        [...m.addedNodes, ...m.removedNodes].some(
          (n) => n instanceof HTMLElement && (n.tagName === 'TABLE' || n.querySelector?.('table'))
        )
      )
      if (hasTableChange) processTables()
    })
    editorObserver.observe(editor, { childList: true, subtree: true })

    return () => {
      editorObserver.disconnect()
      observersRef.current.forEach((obs) => obs.disconnect())
      observersRef.current.clear()
      buttonControllersRef.current.forEach((ac) => ac.abort())
      buttonControllersRef.current.clear()
      hoverControllersRef.current.forEach((ac) => ac.abort())
      hoverControllersRef.current.clear()
      hideTimersRef.current.forEach((t) => clearTimeout(t))
      hideTimersRef.current.clear()
      overlaysRef.current.forEach((overlay) => overlay.parentNode?.removeChild(overlay))
      overlaysRef.current.clear()
      tablesRef.current.clear()
    }
  }, [editorRef, attachTable])

  return null
}
