import { describe, it, expect } from 'vitest'
import { buildRAGPrompt, buildEmptyContextPrompt, generateFollowUpSuggestions } from '@/lib/rag'
import { SAMPLE_CHUNKS } from '../../support/fixtures/test-documents'

describe('buildRAGPrompt', () => {
  it('returns a system prompt with context', () => {
    const result = buildRAGPrompt(SAMPLE_CHUNKS as any)
    expect(result.systemPrompt).toBeTruthy()
    expect(typeof result.systemPrompt).toBe('string')
  })

  it('includes citation markers in prompt', () => {
    const result = buildRAGPrompt(SAMPLE_CHUNKS as any)
    expect(result.systemPrompt).toContain('[1]')
  })

  it('returns sources array', () => {
    const result = buildRAGPrompt(SAMPLE_CHUNKS as any)
    expect(result.sources).toBeInstanceOf(Array)
    expect(result.sources.length).toBe(SAMPLE_CHUNKS.length)
  })

  it('returns a confidence score between 0 and 100', () => {
    const result = buildRAGPrompt(SAMPLE_CHUNKS as any)
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(100)
  })

  it('maps source indices starting at 1', () => {
    const result = buildRAGPrompt(SAMPLE_CHUNKS as any)
    expect(result.sources[0].index).toBe(1)
    expect(result.sources[1].index).toBe(2)
  })

  it('includes chunk content in sources', () => {
    const result = buildRAGPrompt(SAMPLE_CHUNKS as any)
    expect(result.sources[0].content).toBe(SAMPLE_CHUNKS[0].content)
  })

  it('includes static context XML tags for Hoxton identity', () => {
    const result = buildRAGPrompt(SAMPLE_CHUNKS as any)
    expect(result.systemPrompt).toContain('<static_context>')
    expect(result.systemPrompt).toContain('</static_context>')
  })

  it('includes few-shot examples in the prompt', () => {
    const result = buildRAGPrompt(SAMPLE_CHUNKS as any)
    expect(result.systemPrompt).toContain('<examples>')
    expect(result.systemPrompt).toContain('</examples>')
    expect(result.systemPrompt).toContain('<example>')
  })

  it('includes conversation stage layer based on message count', () => {
    const early = buildRAGPrompt(SAMPLE_CHUNKS as any, 0)
    expect(early.systemPrompt).toContain('EARLY')

    const mid = buildRAGPrompt(SAMPLE_CHUNKS as any, 4)
    expect(mid.systemPrompt).toContain('MID')

    const late = buildRAGPrompt(SAMPLE_CHUNKS as any, 8)
    expect(late.systemPrompt).toContain('LATE')
  })
})

describe('buildEmptyContextPrompt', () => {
  it('returns a non-empty string', () => {
    const result = buildEmptyContextPrompt()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('indicates no context is available', () => {
    const result = buildEmptyContextPrompt().toLowerCase()
    expect(
      result.includes('no') || result.includes('not') || result.includes('without')
    ).toBe(true)
  })

  it('includes the Hoxton identity static context', () => {
    const result = buildEmptyContextPrompt()
    expect(result).toContain('<static_context>')
    expect(result).toContain('Hoxton Wealth')
  })

  it('includes few-shot examples', () => {
    const result = buildEmptyContextPrompt()
    expect(result).toContain('<examples>')
  })
})

describe('generateFollowUpSuggestions', () => {
  it('returns an array of suggestions', () => {
    const result = generateFollowUpSuggestions(SAMPLE_CHUNKS as any)
    expect(result).toBeInstanceOf(Array)
  })

  it('returns suggestions as strings', () => {
    const result = generateFollowUpSuggestions(SAMPLE_CHUNKS as any)
    for (const suggestion of result) {
      expect(typeof suggestion).toBe('string')
    }
  })

  it('returns at most 3 suggestions', () => {
    const result = generateFollowUpSuggestions(SAMPLE_CHUNKS as any, 6)
    expect(result.length).toBeLessThanOrEqual(3)
  })
})
