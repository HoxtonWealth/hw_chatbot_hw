export interface TextSection {
  header?: string
  content: string
  level: number
}

export interface TextExtractionResult {
  sections: TextSection[]
  fullText: string
}

// Markdown header regex
const MD_HEADER_REGEX = /^(#{1,6})\s+(.+)$/gm

export function extractText(content: string): TextExtractionResult {
  const fullText = content.trim()

  // Try to parse as markdown first
  if (content.includes('#')) {
    return extractMarkdown(content)
  }

  // Plain text - split by double newlines as paragraph breaks
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim())

  if (paragraphs.length <= 1) {
    return {
      sections: [{ content: fullText, level: 0 }],
      fullText,
    }
  }

  const sections: TextSection[] = paragraphs.map(p => ({
    content: p.trim(),
    level: 0,
  }))

  return { sections, fullText }
}

function extractMarkdown(content: string): TextExtractionResult {
  const sections: TextSection[] = []
  const lines = content.split('\n')

  let currentSection: TextSection = { content: '', level: 0 }
  let currentContent: string[] = []

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)

    if (headerMatch) {
      // Save previous section if it has content
      if (currentContent.length > 0 || currentSection.header) {
        currentSection.content = currentContent.join('\n').trim()
        if (currentSection.content || currentSection.header) {
          sections.push(currentSection)
        }
      }

      // Start new section
      const level = headerMatch[1].length
      currentSection = {
        header: headerMatch[2].trim(),
        content: '',
        level,
      }
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  // Add final section
  currentSection.content = currentContent.join('\n').trim()
  if (currentSection.content || currentSection.header) {
    sections.push(currentSection)
  }

  return {
    sections,
    fullText: content.trim(),
  }
}

export function extractMarkdownContent(content: string): TextExtractionResult {
  return extractMarkdown(content)
}
