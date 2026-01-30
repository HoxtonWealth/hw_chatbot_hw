import mammoth from 'mammoth'

export interface DocxSection {
  header?: string
  content: string
  level: number
}

export interface DocxExtractionResult {
  sections: DocxSection[]
  fullText: string
}

export class DocxParsingError extends Error {
  code = 'E201'
  constructor(message: string) {
    super(message)
    this.name = 'DocxParsingError'
  }
}

export async function extractDocx(buffer: Buffer): Promise<DocxExtractionResult> {
  try {
    // Extract text with style info for structure detection
    const result = await mammoth.convertToHtml({ buffer })
    const text = await mammoth.extractRawText({ buffer })

    // Parse HTML to extract structure
    const sections: DocxSection[] = []
    let currentSection: DocxSection = { content: '', level: 0 }

    // Simple regex to find headers in the HTML
    const headerRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi
    const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi

    // Extract headers and their positions
    const headers: { level: number; text: string; index: number }[] = []
    let match
    while ((match = headerRegex.exec(result.value)) !== null) {
      headers.push({
        level: parseInt(match[1]),
        text: stripHtml(match[2]),
        index: match.index,
      })
    }

    if (headers.length === 0) {
      // No headers found, return as single section
      return {
        sections: [{ content: text.value.trim(), level: 0 }],
        fullText: text.value.trim(),
      }
    }

    // Split content by headers
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]
      const nextHeader = headers[i + 1]

      // Get content between this header and the next
      const startIndex = result.value.indexOf('>', result.value.indexOf(`<h${header.level}`, header.index)) + 1
      const endIndex = nextHeader
        ? result.value.indexOf(`<h${nextHeader.level}`, nextHeader.index)
        : result.value.length

      const sectionHtml = result.value.slice(startIndex, endIndex)
      const sectionText = stripHtml(sectionHtml).trim()

      if (sectionText || header.text) {
        sections.push({
          header: header.text,
          content: sectionText,
          level: header.level,
        })
      }
    }

    // Add any content before the first header
    if (headers[0].index > 0) {
      const preHeaderContent = stripHtml(result.value.slice(0, headers[0].index)).trim()
      if (preHeaderContent) {
        sections.unshift({ content: preHeaderContent, level: 0 })
      }
    }

    return {
      sections,
      fullText: text.value.trim(),
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new DocxParsingError(error.message)
    }
    throw new DocxParsingError('Unknown DOCX parsing error')
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}
