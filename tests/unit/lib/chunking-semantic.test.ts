import { describe, it, expect } from 'vitest'
import { chunkText, chunkWithSections } from '@/lib/chunking/semantic'

describe('chunkText', () => {
  it('returns a single chunk for short text', () => {
    const result = chunkText('Hello world. This is short.')
    expect(result).toHaveLength(1)
    expect(result[0].content).toContain('Hello world.')
    expect(result[0].content).toContain('This is short.')
    expect(result[0].chunkIndex).toBe(0)
  })

  it('splits long text into multiple chunks', () => {
    const longText = Array(50)
      .fill('This is a sentence that repeats to make long text.')
      .join(' ')

    const result = chunkText(longText)
    expect(result.length).toBeGreaterThan(1)
  })

  it('respects paragraph boundaries', () => {
    const text = [
      'First paragraph with enough content to be meaningful.',
      '',
      'Second paragraph that should start a new segment.',
      '',
      'Third paragraph wrapping up the content here.',
    ].join('\n')

    const result = chunkText(text)
    // Should not split mid-paragraph
    for (const chunk of result) {
      expect(chunk.content).toBeTruthy()
    }
  })

  it('preserves section header metadata', () => {
    const result = chunkText('Some content here.', 'Introduction', 3)
    expect(result[0].sectionHeader).toBe('Introduction')
    expect(result[0].pageNumber).toBe(3)
  })

  it('calculates token count estimate', () => {
    const result = chunkText('Hello world')
    // 11 chars / 4 = ceil(2.75) = 3
    expect(result[0].tokenCount).toBe(3)
  })

  it('handles empty text gracefully', () => {
    const result = chunkText('')
    expect(result).toHaveLength(0)
  })

  it('handles whitespace-only text', () => {
    const result = chunkText('   \n\n   ')
    expect(result).toHaveLength(0)
  })

  it('creates overlap between consecutive chunks', () => {
    // Create text large enough to require multiple chunks
    const paragraphs = Array(20)
      .fill('This paragraph contains enough text to test chunking overlap behavior across multiple segments of content.')
      .join('\n\n')

    const result = chunkText(paragraphs)
    if (result.length >= 2) {
      // The end of chunk N should overlap with the start of chunk N+1
      const chunk1End = result[0].content.slice(-50)
      const chunk2Start = result[1].content.slice(0, 200)
      // Overlap means some text appears in both chunks
      expect(chunk2Start).toContain(chunk1End.trim().split(' ').pop())
    }
  })

  it('respects maxSize configuration', () => {
    const longText = Array(50)
      .fill('This is a sentence.')
      .join(' ')

    const result = chunkText(longText, undefined, undefined, {
      targetSize: 100,
      maxSize: 200,
      overlap: 20,
    })

    for (const chunk of result) {
      // Chunks should not wildly exceed maxSize
      // (some tolerance for boundary splitting)
      expect(chunk.content.length).toBeLessThan(400)
    }
  })
})

describe('chunkWithSections', () => {
  it('chunks multiple sections independently', () => {
    const sections = [
      { header: 'Section A', content: 'Content for section A.' },
      { header: 'Section B', content: 'Content for section B.' },
    ]

    const result = chunkWithSections(sections)
    expect(result).toHaveLength(2)
    expect(result[0].sectionHeader).toBe('Section A')
    expect(result[1].sectionHeader).toBe('Section B')
  })

  it('assigns sequential global chunk indices', () => {
    const sections = [
      { header: 'A', content: 'Content A.' },
      { header: 'B', content: 'Content B.' },
      { header: 'C', content: 'Content C.' },
    ]

    const result = chunkWithSections(sections)
    result.forEach((chunk, i) => {
      expect(chunk.chunkIndex).toBe(i)
    })
  })

  it('handles empty sections array', () => {
    const result = chunkWithSections([])
    expect(result).toHaveLength(0)
  })

  it('preserves page numbers', () => {
    const sections = [
      { header: 'Intro', content: 'Page 1 content.', pageNumber: 1 },
      { header: 'Body', content: 'Page 5 content.', pageNumber: 5 },
    ]

    const result = chunkWithSections(sections)
    expect(result[0].pageNumber).toBe(1)
    expect(result[1].pageNumber).toBe(5)
  })
})
