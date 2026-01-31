import * as XLSX from 'xlsx'

export interface SpreadsheetSection {
  header?: string
  content: string
  level: number
}

export interface SpreadsheetExtractionResult {
  sections: SpreadsheetSection[]
  fullText: string
  sheetCount: number
  truncated: boolean
}

export class SpreadsheetParsingError extends Error {
  code = 'E201'
  constructor(message: string) {
    super(message)
    this.name = 'SpreadsheetParsingError'
  }
}

const MAX_ROWS_PER_SHEET = 10000
const MAX_TOTAL_ROWS = 50000

export function extractSpreadsheet(buffer: Buffer): SpreadsheetExtractionResult {
  try {
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellFormula: false, // Evaluate formulas to values
      cellDates: true,    // Parse dates
    })

    const sections: SpreadsheetSection[] = []
    const allText: string[] = []
    let totalRows = 0
    let truncated = false
    const visibleSheets = workbook.SheetNames.filter(name => {
      const sheet = workbook.Sheets[name]
      // Skip hidden sheets (SheetJS marks them in Workbook.Sheets)
      if (workbook.Workbook?.Sheets) {
        const sheetInfo = workbook.Workbook.Sheets.find(
          (s: { name?: string }) => s.name === name
        )
        if (sheetInfo && (sheetInfo as { Hidden?: number }).Hidden) return false
      }
      // Skip empty sheets
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1')
      return range.e.r > 0 || range.e.c > 0 || sheet['A1']
    })

    for (const sheetName of visibleSheets) {
      if (totalRows >= MAX_TOTAL_ROWS) {
        truncated = true
        break
      }

      const sheet = workbook.Sheets[sheetName]
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1')
      const rowCount = range.e.r - range.s.r + 1

      // Detect headers from first row
      const headers: string[] = []
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
        const cell = sheet[cellAddress]
        if (cell && cell.v !== undefined && cell.v !== null) {
          headers.push(String(cell.v).trim())
        } else {
          // Use column letter if no header
          headers.push(XLSX.utils.encode_col(col))
        }
      }

      // Check if first row looks like headers (heuristic: all text, no numbers)
      const firstRowIsHeader = headers.every(h => isNaN(Number(h)) && h.length > 0)
      const dataStartRow = firstRowIsHeader ? range.s.r + 1 : range.s.r
      const effectiveHeaders = firstRowIsHeader
        ? headers
        : headers.map((_, i) => XLSX.utils.encode_col(i))

      const rowsToProcess = Math.min(
        rowCount - (firstRowIsHeader ? 1 : 0),
        MAX_ROWS_PER_SHEET,
        MAX_TOTAL_ROWS - totalRows
      )

      if (rowsToProcess < rowCount - (firstRowIsHeader ? 1 : 0)) {
        truncated = true
      }

      const rowTexts: string[] = []

      for (let row = dataStartRow; row < dataStartRow + rowsToProcess; row++) {
        const rowParts: string[] = []
        let hasData = false

        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          const cell = sheet[cellAddress]

          if (cell && cell.v !== undefined && cell.v !== null) {
            let value: string
            if (cell.t === 'd' && cell.v instanceof Date) {
              value = cell.v.toISOString().split('T')[0]
            } else {
              value = String(cell.v).trim()
            }

            if (value) {
              const headerIndex = col - range.s.c
              const header = headerIndex < effectiveHeaders.length
                ? effectiveHeaders[headerIndex]
                : XLSX.utils.encode_col(col)
              rowParts.push(`${header}: ${value}`)
              hasData = true
            }
          }
        }

        if (hasData) {
          rowTexts.push(rowParts.join(' | '))
          totalRows++
        }
      }

      if (rowTexts.length > 0) {
        const sectionContent = rowTexts.join('\n')
        sections.push({
          header: visibleSheets.length > 1 ? `Sheet: ${sheetName}` : sheetName,
          content: sectionContent,
          level: 1,
        })
        allText.push(
          visibleSheets.length > 1 ? `## Sheet: ${sheetName}\n\n${sectionContent}` : sectionContent
        )
      }
    }

    const fullText = allText.join('\n\n')

    if (!fullText.trim()) {
      throw new SpreadsheetParsingError('No data found in spreadsheet')
    }

    return {
      sections,
      fullText,
      sheetCount: visibleSheets.length,
      truncated,
    }
  } catch (error) {
    if (error instanceof SpreadsheetParsingError) {
      throw error
    }
    if (error instanceof Error) {
      throw new SpreadsheetParsingError(error.message)
    }
    throw new SpreadsheetParsingError('Unknown spreadsheet parsing error')
  }
}

/**
 * Extract CSV content from a buffer.
 * Uses SheetJS to parse, which handles various CSV dialects.
 */
export function extractCSV(buffer: Buffer): SpreadsheetExtractionResult {
  try {
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      raw: true,
    })

    // CSV files have a single sheet
    return extractSpreadsheet(
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    )
  } catch (error) {
    if (error instanceof SpreadsheetParsingError) {
      throw error
    }
    if (error instanceof Error) {
      throw new SpreadsheetParsingError(error.message)
    }
    throw new SpreadsheetParsingError('Unknown CSV parsing error')
  }
}
