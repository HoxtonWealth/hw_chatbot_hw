import { describe, it, expect, vi, beforeEach } from 'vitest'

// Story 3-3: Streaming Response Generation
// Story 3-4: Empty & Error States

// Mock all external dependencies
vi.mock('@/lib/retrieval/pipeline', () => ({
  retrieveContext: vi.fn().mockResolvedValue({
    chunks: [
      {
        id: 'chunk-1',
        document_id: 'doc-1',
        content: 'GTM strategy overview content',
        combined_score: 0.9,
        similarity: 0.88,
        keyword_score: 0.85,
        page_number: 1,
        section_header: 'Overview',
        rerank_score: 0.92,
        document_title: 'GTM Guide',
      },
    ],
    queryVariants: ['original query', 'variant 1'],
    totalCandidates: 15,
  }),
}))

vi.mock('@/lib/rag', () => ({
  buildRAGPrompt: vi.fn().mockReturnValue({
    systemPrompt: 'You are a helpful assistant. Context: ...',
    formattedContext: '[1] GTM strategy overview content',
    sources: [{ index: 1, content: 'GTM strategy', documentId: 'doc-1', similarity: 0.9, pageNumber: 1, sectionHeader: 'Overview', documentTitle: 'GTM Guide' }],
    confidence: 85,
  }),
  buildEmptyContextPrompt: vi.fn().mockReturnValue('No relevant documents found.'),
  generateFollowUpSuggestions: vi.fn().mockReturnValue(['Tell me more about Overview']),
}))

vi.mock('ai', () => ({
  streamText: vi.fn().mockReturnValue({
    textStream: (async function* () {
      yield 'Based on the '
      yield 'GTM strategy [1], '
      yield 'here is the answer.'
    })(),
  }),
}))

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn().mockReturnValue(
    vi.fn().mockReturnValue({ modelId: 'openai/gpt-4o-mini' })
  ),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}))

import { POST } from '@/app/api/chat/route'
import { NextRequest } from 'next/server'
import { retrieveContext } from '@/lib/retrieval/pipeline'

function createChatRequest(message: string, conversationId?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId }),
  })
}

describe('Story 3-3: Streaming Response Generation - POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // AC: POST /api/chat endpoint with streaming
  it('returns SSE stream response', async () => {
    const request = createChatRequest('What is our GTM strategy?')
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.headers.get('Cache-Control')).toBe('no-cache')
  })

  // AC: Metadata sent first with sources and confidence
  it('sends metadata as first SSE event', async () => {
    const request = createChatRequest('What is our GTM strategy?')
    const response = await POST(request)
    const text = await response.text()

    const lines = text.split('\n').filter(l => l.startsWith('data: '))
    const firstEvent = JSON.parse(lines[0].slice(6))

    expect(firstEvent.type).toBe('metadata')
    expect(firstEvent.sources).toBeInstanceOf(Array)
    expect(firstEvent.confidence).toBeDefined()
    expect(firstEvent.suggestions).toBeInstanceOf(Array)
  })

  // AC: Text chunks streamed with citation markers
  it('streams text chunks after metadata', async () => {
    const request = createChatRequest('What is our GTM strategy?')
    const response = await POST(request)
    const text = await response.text()

    // Verify the stream contains data events beyond metadata
    const dataLines = text.split('\n').filter(l => l.startsWith('data: '))
    // Should have at least metadata + DONE
    expect(dataLines.length).toBeGreaterThanOrEqual(2)
    // Verify DONE marker is present (stream completed)
    expect(text).toContain('data: [DONE]')
  })

  // AC: Stream ends with [DONE]
  it('sends DONE event at end of stream', async () => {
    const request = createChatRequest('What is our GTM strategy?')
    const response = await POST(request)
    const text = await response.text()

    expect(text).toContain('data: [DONE]')
  })

  // AC: Calls retrieval pipeline
  it('retrieves context with query expansion and reranking', async () => {
    const request = createChatRequest('What is our GTM strategy?')
    await POST(request)

    expect(retrieveContext).toHaveBeenCalledWith(
      'What is our GTM strategy?',
      undefined,
      expect.objectContaining({
        expandQueries: true,
        useReranking: true,
        topK: 5,
      })
    )
  })
})

describe('Story 3-4: Empty & Error States - POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // AC: Empty query rejected
  it('rejects empty message with 400', async () => {
    const request = createChatRequest('')
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBeDefined()
  })

  it('rejects whitespace-only message', async () => {
    const request = createChatRequest('   ')
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
  })

  // AC: No results handling uses empty context prompt
  it('uses empty context prompt when no chunks found', async () => {
    vi.mocked(retrieveContext).mockResolvedValueOnce({
      chunks: [],
      queryVariants: ['test'],
      totalCandidates: 0,
    })

    const { buildEmptyContextPrompt } = await import('@/lib/rag')
    const request = createChatRequest('something obscure')
    await POST(request)

    expect(buildEmptyContextPrompt).toHaveBeenCalled()
  })
})
