import './TableEdgeButtons.css'
import { useEffect, useRef, useCallback } from 'react'
import { callCommand } from '@milkdown/kit/utils'
import { addRowAfterCommand, addColAfterCommand } from '@milkdown/kit/preset/gfm'

interface TableEdgeButtonsProps {
  editorRef: React.RefObject<HTMLDivElement>
  getInstance: ReturnType<typeof import('@milkdown/react').useInstance>[1]
}

export function TableEdgeButtons({ editorRef, getInstance }: TableEdgeButtonsProps) {
  const tablesRef = useRef<Set<HTMLElement>>(new Set())
  const buttonsRef = useRef<Map<HTMLElement, HTMLElement>>(new Map())

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
  }, [])

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
        handleAddRow(rowIndex)
      })
      container.appendChild(addRowBtn)
    })

    const colCount = rows[0]?.querySelectorAll('td, th').length || 0
    for (let colIndex = 0; colIndex < colCount; colIndex++) {
      const addColBtn = document.createElement('button')
      addColBtn.className = 'table-edge-btn table-add-col-btn'
      addColBtn.textContent = '+'
      addColBtn.style.left = `${table.offsetWidth / 2 - 10}px`
      addColBtn.addEventListener('click', (e) => {
        e.preventDefault()
        handleAddCol(colIndex)
      })
      container.appendChild(addColBtn)
    }
  }, [])

  const handleAddRow = useCallback((_rowIndex: number) => {
    const instance = getInstance()
    if (!instance) return
    instance.action(callCommand(addRowAfterCommand.key))
  }, [getInstance])

  const handleAddCol = useCallback((_colIndex: number) => {
    const instance = getInstance()
    if (!instance) return
    instance.action(callCommand(addColAfterCommand.key))
  }, [getInstance])

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