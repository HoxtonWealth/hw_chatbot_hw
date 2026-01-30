export interface ExtractedPage {
  pageNumber: number
  content: string
}

export interface PDFExtractionResult {
  pages: ExtractedPage[]
  totalPages: number
  isScanned: boolean
}

export class PDFEncryptedError extends Error {
  code = 'E107'
  constructor() {
    super('PDF is password protected')
    this.name = 'PDFEncryptedError'
  }
}

export class PDFParsingError extends Error {
  code = 'E201'
  constructor(message: string) {
    super(message)
    this.name = 'PDFParsingError'
  }
}

export async function extractPDF(buffer: Buffer): Promise<PDFExtractionResult> {
  try {
    // Use pdf-parse/lib/pdf-parse directly to avoid the default index.js
    // which tries to load ./test/data/05-versions-space.pdf on import
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdf = require('pdf-parse/lib/pdf-parse')

    const data = await pdf(buffer, {
      // Return page-by-page content
      pagerender: async function (pageData: { getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) {
        const textContent = await pageData.getTextContent()
        return textContent.items
          .map((item: { str: string }) => item.str)
          .join(' ')
      },
    })

    // Check if PDF is encrypted (pdf-parse throws on encrypted PDFs)
    // This check happens during parsing above

    // Split content by form feed character (page break) if available
    // Otherwise, estimate pages from text length
    const pageTexts: string[] = data.text.split('\f').filter((t: string) => t.trim())

    // If we couldn't split by pages, create one page with all content
    const pages: ExtractedPage[] = pageTexts.length > 0
      ? pageTexts.map((content, index) => ({
          pageNumber: index + 1,
          content: content.trim(),
        }))
      : [{
          pageNumber: 1,
          content: data.text.trim(),
        }]

    // Detect if PDF is scanned (very little text extracted compared to page count)
    const avgCharsPerPage = data.text.length / data.numpages
    const isScanned = avgCharsPerPage < 100 && data.numpages > 0

    return {
      pages,
      totalPages: data.numpages,
      isScanned,
    }
  } catch (error) {
    if (error instanceof Error) {
      // pdf-parse throws specific error for encrypted PDFs
      if (error.message.includes('password') || error.message.includes('encrypted')) {
        throw new PDFEncryptedError()
      }
      throw new PDFParsingError(error.message)
    }
    throw new PDFParsingError('Unknown PDF parsing error')
  }
}
