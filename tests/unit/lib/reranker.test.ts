import { describe, it, expect, vi, beforeEach } from 'vitest'

// Story 3-2: Re-ranking acceptance criteria

// Mock OpenAI
vi.mock('@/lib/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({ scores: [9, 7, 5, 3, 1, 8] }),
            },
          }],
        }),
      },
    },
  },
}))

import { rerank, RankedResult } from '@/lib/retrieval/reranker'
import { SearchResult } from '@/lib/retrieval/hybrid'

function createSearchResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: 'chunk-1',
    document_id: 'doc-1',
    content: 'Test content for reranking',
    summary: null,
    page_number: null,
    section_header: null,
    similarity: 0.8,
    keyword_score: 0.7,
    combined_score: 0.76,
    ...overrides,
  }
}

describe('Story 3-2: Re-ranking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // AC: Re-ranking applied to combined results
  it('returns results with rerank_score', async () => {
    const results = Array.from({ length: 6 }, (_, i) =>
      createSearchResult({ id: `chunk-${i}`, content: `Content ${i}` })
    )

    const reranked = await rerank(results, 'test query')

    expect(reranked.length).toBe(results.length)
    for (const r of reranked) {
      expect(r).toHaveProperty('rerank_score')
      expect(typeof r.rerank_score).toBe('number')
    }
  })

  // AC: Results sorted by rerank score
  it('sorts results by rerank score descending', async () => {
    const results = Array.from({ length: 6 }, (_, i) =>
      createSearchResult({ id: `chunk-${i}`, content: `Content ${i}` })
    )

    const reranked = await rerank(results, 'test query')

    for (let i = 1; i < reranked.length; i++) {
      expect(reranked[i - 1].rerank_score).toBeGreaterThanOrEqual(reranked[i].rerank_score)
    }
  })

  // AC: Small sets skip reranking
  it('skips LLM reranking for 5 or fewer results', async () => {
    const results = Array.from({ length: 3 }, (_, i) =>
      createSearchResult({ id: `chunk-${i}`, combined_score: 0.9 - i * 0.1 })
    )

    const { openai } = await import('@/lib/openai')
    const reranked = await rerank(results, 'test query')

    // Should NOT have called the LLM
    expect(openai.chat.completions.create).not.toHaveBeenCalled()
    // Should use combined_score as rerank_score
    expect(reranked[0].rerank_score).toBe(results[0].combined_score)
  })

  // AC: Handles empty results
  it('returns empty array for no results', async () => {
    const reranked = await rerank([], 'test query')
    expect(reranked).toEqual([])
  })

  // AC: Fallback on LLM error
  it('falls back to original scores on LLM error', async () => {
    const { openai } = await import('@/lib/openai')
    vi.mocked(openai.chat.completions.create).mockRejectedValueOnce(new Error('API error'))

    const results = Array.from({ length: 6 }, (_, i) =>
      createSearchResult({ id: `chunk-${i}`, combined_score: 0.8 })
    )

    const reranked = await rerank(results, 'test query')

    expect(reranked.length).toBe(6)
    // Should fall back to combined_score
    expect(reranked[0].rerank_score).toBe(0.8)
  })
})
