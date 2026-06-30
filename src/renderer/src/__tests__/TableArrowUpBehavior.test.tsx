import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EditorState, TextSelection, Transaction } from '@milkdown/kit/prose/state'
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
})