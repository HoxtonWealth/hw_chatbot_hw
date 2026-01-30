import { describe, it, expect, vi, beforeEach } from 'vitest'

// Story 3-1: Hybrid Search acceptance criteria

const { mockRpcResult } = vi.hoisted(() => ({
  mockRpcResult: [
    {
      id: 'chunk-1',
      document_id: 'doc-1',
      content: 'GTM strategy overview',
      summary: null,
      page_number: 1,
      section_header: 'Overview',
      similarity: 0.92,
      keyword_score: 0.85,
      combined_score: 0.90,
    },
    {
      id: 'chunk-2',
      document_id: 'doc-1',
      content: 'Target market analysis',
      summary: null,
      page_number: 2,
      section_header: 'Target Market',
      similarity: 0.78,
      keyword_score: 0.60,
      combined_score: 0.73,
    },
  ],
}))

vi.mock('@/lib/openai', () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    rpc: vi.fn().mockResolvedValue({ data: mockRpcResult, error: null }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockRpcResult, error: null }),
    }),
  },
}))

import { hybridSearch, vectorSearch } from '@/lib/retrieval/hybrid'
import { generateEmbedding } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase'

describe('Story 3-1: Hybrid Search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // AC: Vector search using pgvector cosine similarity
  it('generates query embedding for search', async () => {
    await hybridSearch({ query: 'GTM strategy' })
    expect(generateEmbedding).toHaveBeenCalledWith('GTM strategy')
  })

  // AC: Combined scoring (70% vector, 30% keyword)
  it('calls hybrid search RPC with correct parameters', async () => {
    await hybridSearch({ query: 'GTM strategy', limit: 20, threshold: 0.5 })

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('match_chunks_hybrid', expect.objectContaining({
      query_text: 'GTM strategy',
      match_count: 20,
      similarity_threshold: 0.5,
    }))
  })

  // AC: Returns search results with scores
  it('returns results with combined_score', async () => {
    const results = await hybridSearch({ query: 'GTM strategy' })

    expect(results.length).toBe(2)
    expect(results[0]).toHaveProperty('combined_score')
    expect(results[0]).toHaveProperty('similarity')
    expect(results[0]).toHaveProperty('keyword_score')
  })

  // AC: Top 20 initial retrieval
  it('defaults to limit 20', async () => {
    await hybridSearch({ query: 'test' })

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
      'match_chunks_hybrid',
      expect.objectContaining({ match_count: 20 })
    )
  })

  // AC: Similarity threshold filtering (>0.5)
  it('defaults to threshold 0.5', async () => {
    await hybridSearch({ query: 'test' })

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
      'match_chunks_hybrid',
      expect.objectContaining({ similarity_threshold: 0.5 })
    )
  })

  // AC: Filter by document IDs
  it('passes document filter to RPC', async () => {
    await hybridSearch({ query: 'test', documentIds: ['doc-1', 'doc-2'] })

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
      'match_chunks_hybrid',
      expect.objectContaining({ filter_document_ids: ['doc-1', 'doc-2'] })
    )
  })

  // AC: Error handling
  it('throws on RPC error', async () => {
    vi.mocked(supabaseAdmin.rpc).mockResolvedValueOnce({
      data: null,
      error: { name: 'PostgrestError', message: 'RPC failed', details: '', hint: '', code: '500' },
      count: null,
      status: 500,
      statusText: 'Internal Server Error',
    } as any)

    await expect(hybridSearch({ query: 'test' })).rejects.toThrow('Search failed')
  })
})

describe('Story 3-1: Vector Search Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides fallback vector-only search', async () => {
    const results = await vectorSearch({ query: 'test query' })
    expect(results).toBeInstanceOf(Array)
  })
})
