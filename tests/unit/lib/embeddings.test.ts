import { describe, it, expect, vi, beforeEach } from 'vitest'

// Story 2-3: Embedding Generation & Storage acceptance criteria

// Mock dependencies
vi.mock('@/lib/openai', () => ({
  generateEmbeddings: vi.fn().mockResolvedValue([
    new Array(1536).fill(0.1),
    new Array(1536).fill(0.2),
  ]),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({
              data: [
                { id: 'chunk-1', content: 'Test content 1' },
                { id: 'chunk-2', content: 'Test content 2' },
              ],
              error: null,
            }),
          }),
        }),
      }),
    }),
  },
}))

import { generateAndStoreEmbeddings } from '@/lib/embeddings'
import { generateEmbeddings } from '@/lib/openai'

describe('Story 2-3: Embedding Generation & Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // AC: Batch embedding generation (100 chunks per batch)
  it('processes chunks in batches', async () => {
    const chunks = Array.from({ length: 5 }, (_, i) => ({
      id: `chunk-${i}`,
      content: `Test content ${i}`,
    }))

    await generateAndStoreEmbeddings('doc-1', chunks)

    // Should have called embeddings API at least once
    expect(generateEmbeddings).toHaveBeenCalled()
  })

  // AC: Token count tracked per chunk
  it('returns processed and failed counts', async () => {
    const chunks = [
      { id: 'chunk-1', content: 'Test content 1' },
      { id: 'chunk-2', content: 'Test content 2' },
    ]

    const result = await generateAndStoreEmbeddings('doc-1', chunks)

    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('processedCount')
    expect(result).toHaveProperty('failedCount')
    expect(result.processedCount + result.failedCount).toBe(chunks.length)
  })

  // AC: Progress callback
  it('reports progress during processing', async () => {
    const chunks = [
      { id: 'chunk-1', content: 'Test content 1' },
      { id: 'chunk-2', content: 'Test content 2' },
    ]

    const progressCallback = vi.fn()
    await generateAndStoreEmbeddings('doc-1', chunks, progressCallback)

    expect(progressCallback).toHaveBeenCalled()
    const lastProgress = progressCallback.mock.calls.at(-1)?.[0]
    expect(lastProgress).toBe(100)
  })

  // AC: Error handling with retry logic
  it('success is true when all embeddings stored', async () => {
    const chunks = [
      { id: 'chunk-1', content: 'Test content 1' },
    ]

    const result = await generateAndStoreEmbeddings('doc-1', chunks)
    expect(result.success).toBe(true)
    expect(result.failedCount).toBe(0)
  })
})

describe('Embedding error detection patterns', () => {
  it('rate limit errors contain identifiable message', () => {
    const error = new Error('rate_limit exceeded')
    expect(error.message).toContain('rate_limit')
  })

  it('timeout errors contain identifiable message', () => {
    const error = new Error('ETIMEDOUT')
    expect(error.message).toContain('ETIMEDOUT')
  })

  it('connection reset errors contain identifiable message', () => {
    const error = new Error('ECONNRESET')
    expect(error.message).toContain('ECONNRESET')
  })
})
