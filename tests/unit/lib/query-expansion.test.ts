import { describe, it, expect, vi, beforeEach } from 'vitest'

// Story 3-2: Query Expansion & Re-ranking acceptance criteria

// Mock OpenAI client
vi.mock('@/lib/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                variants: ['what is GTM strategy', 'go-to-market approach', 'GTM plan overview'],
              }),
            },
          }],
        }),
      },
    },
  },
}))

import { expandQuery } from '@/lib/retrieval/query-expansion'

describe('Story 3-2: Query Expansion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // AC: Query expansion generates 3 query variants via LLM
  it('returns original query plus variants', async () => {
    const result = await expandQuery('GTM strategy')

    expect(result).toBeInstanceOf(Array)
    expect(result[0]).toBe('GTM strategy') // Original always first
    expect(result.length).toBeGreaterThan(1)
    expect(result.length).toBeLessThanOrEqual(4) // original + 3 variants
  })

  // AC: Graceful fallback on error
  it('falls back to original query on LLM error', async () => {
    const { openai } = await import('@/lib/openai')
    vi.mocked(openai.chat.completions.create).mockRejectedValueOnce(new Error('API error'))

    const result = await expandQuery('test query')

    expect(result).toEqual(['test query'])
  })
})
