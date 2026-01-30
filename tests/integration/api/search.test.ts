import { describe, it, expect, vi, beforeEach } from 'vitest'

// Story 3-1: Search API endpoint

vi.mock('@/lib/retrieval/hybrid', () => ({
  hybridSearch: vi.fn().mockResolvedValue([
    {
      id: 'chunk-1',
      document_id: 'doc-1',
      content: 'Result content',
      combined_score: 0.85,
      similarity: 0.88,
      keyword_score: 0.75,
    },
  ]),
}))

import { POST } from '@/app/api/search/route'
import { NextRequest } from 'next/server'
import { hybridSearch } from '@/lib/retrieval/hybrid'

function createSearchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Story 3-1: POST /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // AC: Accepts query and returns results
  it('returns search results for valid query', async () => {
    const request = createSearchRequest({ query: 'GTM strategy' })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.results).toBeInstanceOf(Array)
    expect(body.count).toBeGreaterThan(0)
  })

  // AC: Passes parameters to hybrid search
  it('forwards document filter and limit', async () => {
    const request = createSearchRequest({
      query: 'test',
      documentIds: ['doc-1'],
      limit: 10,
      threshold: 0.7,
    })

    await POST(request)

    expect(hybridSearch).toHaveBeenCalledWith(expect.objectContaining({
      query: 'test',
      documentIds: ['doc-1'],
      limit: 10,
      threshold: 0.7,
    }))
  })

  // AC: Empty query rejected
  it('rejects empty query with E301', async () => {
    const request = createSearchRequest({ query: '' })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('E301')
  })

  it('rejects whitespace query', async () => {
    const request = createSearchRequest({ query: '   ' })
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  // AC: Error handling
  it('returns 500 on search failure', async () => {
    vi.mocked(hybridSearch).mockRejectedValueOnce(new Error('DB error'))

    const request = createSearchRequest({ query: 'test' })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error.code).toBe('E300')
  })
})
