import { describe, it, expect } from 'vitest'
import { extractText, extractMarkdownContent } from '@/lib/extraction/text'

describe('extractText', () => {
  it('extracts plain text content', () => {
    const result = extractText('Hello, this is plain text content.')
    expect(result.fullText).toBe('Hello, this is plain text content.')
  })

  it('returns sections array', () => {
    const result = extractText('Some text content here.')
    expect(result.sections).toBeInstanceOf(Array)
    expect(result.sections.length).toBeGreaterThan(0)
  })

  it('handles empty string', () => {
    const result = extractText('')
    expect(result.fullText).toBe('')
  })

  it('handles UTF-8 content', () => {
    const result = extractText('Caf\u00e9 and na\u00efve text with special chars')
    expect(result.fullText).toContain('Caf\u00e9')
  })

  it('splits paragraphs into sections', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.'
    const result = extractText(text)
    expect(result.sections.length).toBe(3)
  })

  it('detects markdown and delegates to markdown parser', () => {
    const md = '# Title\n\nSome content.'
    const result = extractText(md)
    // Should detect the # and use markdown parsing
    expect(result.sections.length).toBeGreaterThan(0)
  })
})

describe('extractMarkdownContent', () => {
  it('extracts markdown with sections', () => {
    const md = '# Title\n\nSome content.\n\n## Section\n\nMore content.'
    const result = extractMarkdownContent(md)
    expect(result.sections).toBeInstanceOf(Array)
    expect(result.sections.length).toBeGreaterThan(0)
  })

  it('identifies headers as section boundaries', () => {
    const md = '# First\n\nContent 1.\n\n## Second\n\nContent 2.'
    const result = extractMarkdownContent(md)

    const headers = result.sections
      .map(s => s.header)
      .filter(Boolean)
    expect(headers.length).toBeGreaterThan(0)
    expect(headers).toContain('First')
    expect(headers).toContain('Second')
  })

  it('handles markdown without headers', () => {
    const md = 'Just plain text without any headers or formatting.'
    const result = extractMarkdownContent(md)
    expect(result.sections).toBeInstanceOf(Array)
    expect(result.sections.length).toBeGreaterThan(0)
  })

  it('tracks header level', () => {
    const md = '# H1\n\nContent\n\n## H2\n\nContent\n\n### H3\n\nContent'
    const result = extractMarkdownContent(md)
    const levels = result.sections.map(s => s.level)
    expect(levels).toContain(1)
    expect(levels).toContain(2)
    expect(levels).toContain(3)
  })
})
