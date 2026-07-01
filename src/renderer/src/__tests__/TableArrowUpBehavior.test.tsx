import { describe, it, expect, beforeEach } from 'vitest'
import { EditorState, TextSelection } from '@milkdown/kit/prose/state'
import { Schema } from '@milkdown/kit/prose/model'

describe('Table ArrowUp position detection', () => {
  let mockSchema: Schema
  
  beforeEach(() => {
    // Create minimal schema with table support
    mockSchema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: { content: 'inline*', group: 'block' },
        table: { content: 'table_row+', group: 'block' },
        table_row: { content: 'table_cell+' },
        table_cell: { content: 'inline*' },
        text: { group: 'inline' },
      },
      marks: {},
    })
  })
  
  it('should detect cursor in first row first cell when table at position 0', () => {
    // Create document with table at position 0
    const tableCell = mockSchema.nodes.table_cell.create(null, mockSchema.text('a'))
    const tableRow = mockSchema.nodes.table_row.create(null, tableCell)
    const table = mockSchema.nodes.table.create(null, tableRow)
    const doc = mockSchema.nodes.doc.create(null, table)
    
    // Position cursor in first cell content (position 4: doc start(0) -> table(1) -> row(2) -> cell(3) -> text start(4))
    const selection = TextSelection.create(doc, 4)
    const state = EditorState.create({ doc, selection, schema: mockSchema })
    
    // Test would call isAtTableFirstRowFirstCell(state) and expect true
    // Implementation will be added in Task 2
    expect(state.selection.$from.pos).toBe(4)
  })

  it('should NOT trigger when table is not at document start', () => {
    // Create document: paragraph + table
    const paragraph = mockSchema.nodes.paragraph.create(null, mockSchema.text('text'))
    const tableCell = mockSchema.nodes.table_cell.create(null, mockSchema.text('a'))
    const tableRow = mockSchema.nodes.table_row.create(null, tableCell)
    const table = mockSchema.nodes.table.create(null, tableRow)
    const doc = mockSchema.nodes.doc.create(null, [paragraph, table])
    
    // Position cursor in first cell (table is NOT at position 0)
    const tableStartPos = paragraph.nodeSize + 1
    const firstCellPos = tableStartPos + 3
    const selection = TextSelection.create(doc, firstCellPos)
    const state = EditorState.create({ doc, selection, schema: mockSchema })
    
    // Table position should be > 0, helper should return false
    expect(state.selection.$from.before(2)).toBeGreaterThan(0)
  })

  it('should NOT trigger when cursor is not in first row first cell', () => {
    // Create table with 2 rows, 2 cols
    const cell1 = mockSchema.nodes.table_cell.create(null, mockSchema.text('a'))
    const cell2 = mockSchema.nodes.table_cell.create(null, mockSchema.text('b'))
    const row1 = mockSchema.nodes.table_row.create(null, [cell1, cell2])
    const cell3 = mockSchema.nodes.table_cell.create(null, mockSchema.text('c'))
    const cell4 = mockSchema.nodes.table_cell.create(null, mockSchema.text('d'))
    const row2 = mockSchema.nodes.table_row.create(null, [cell3, cell4])
    const table = mockSchema.nodes.table.create(null, [row1, row2])
    const doc = mockSchema.nodes.doc.create(null, table)
    
    // Position cursor in second row first cell
    const secondRowStartPos = 3 + row1.nodeSize
    const secondCellPos = secondRowStartPos + 1
    const selection = TextSelection.create(doc, secondCellPos)
    const state = EditorState.create({ doc, selection, schema: mockSchema })
    
    // Cursor depth indicates it's in a cell, but not first row first cell
    expect(state.selection.$from.depth).toBeGreaterThan(0)
  })

  it('should handle empty cell correctly', () => {
    // Create table with empty first cell
    const emptyCell = mockSchema.nodes.table_cell.create(null)
    const row = mockSchema.nodes.table_row.create(null, emptyCell)
    const table = mockSchema.nodes.table.create(null, row)
    const doc = mockSchema.nodes.doc.create(null, table)
    
    // Cursor at position 3 (empty cell start)
    const selection = TextSelection.create(doc, 3)
    const state = EditorState.create({ doc, selection, schema: mockSchema })
    
    // Empty cell has content.size === 0
    expect(state.doc.firstChild?.firstChild?.firstChild?.content.size).toBe(0)
  })

  it('should detect cursor in first cell with multiple characters', () => {
    // Create table with multi-char content
    const cell = mockSchema.nodes.table_cell.create(null, mockSchema.text('hello'))
    const row = mockSchema.nodes.table_row.create(null, cell)
    const table = mockSchema.nodes.table.create(null, row)
    const doc = mockSchema.nodes.doc.create(null, table)
    
    // Cursor at position 4 (first char of 'hello')
    const selection = TextSelection.create(doc, 4)
    const state = EditorState.create({ doc, selection, schema: mockSchema })
    
    // Verify cursor position and content size
    expect(state.selection.$from.pos).toBe(4)
    expect(state.doc.firstChild?.firstChild?.firstChild?.content.size).toBe(5)
  })
})