# Story 3.3: Streaming Response Generation

Status: review

## Story

As a **user**,
I want **to see answers stream in real-time**,
so that **I get fast feedback during queries**.

## Acceptance Criteria

1. POST /api/chat endpoint with streaming
2. Vercel AI SDK streaming integration
3. LLM prompt with retrieved context and citations
4. Inline citation markers [1], [2], etc.
5. Query-to-first-token under 2 seconds
6. Query-to-complete under 5 seconds (p95)
7. Partial answer handling on LLM timeout

## Tasks / Subtasks

- [ ] Task 1: Create chat API route with streaming (AC: 1, 2)
  - [ ] Create `src/app/api/chat/route.ts`
  - [ ] Use Vercel AI SDK `streamText`
  - [ ] Configure OpenAI provider
  - [ ] Return streaming Response

- [ ] Task 2: Build RAG prompt with context (AC: 3)
  - [ ] Create `src/lib/rag.ts`
  - [ ] Build system prompt with citation instructions
  - [ ] Format context from retrieved chunks
  - [ ] Include source numbers for citations

- [ ] Task 3: Implement inline citations (AC: 4)
  - [ ] Prompt LLM to use [1], [2] markers
  - [ ] Parse citation markers in response
  - [ ] Link markers to source metadata

- [ ] Task 4: Implement performance tracking (AC: 5, 6)
  - [ ] Track time-to-first-token
  - [ ] Track time-to-complete
  - [ ] Log metrics to query_logs table
  - [ ] Alert if exceeding thresholds

- [ ] Task 5: Handle timeout and partial responses (AC: 7)
  - [ ] Set 30-second generation timeout
  - [ ] On timeout, return partial response
  - [ ] Mark response as partial with explanation
  - [ ] Log timeout events

- [ ] Task 6: Stream metadata after response (AC: 3)
  - [ ] Send sources as data event
  - [ ] Send confidence score as data event
  - [ ] Send follow-up suggestions

## Dev Notes

### Chat API Route with Streaming

```typescript
// src/app/api/chat/route.ts
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { retrieveContext } from '@/lib/retrieval/pipeline'
import { buildRAGPrompt } from '@/lib/rag'

export async function POST(request: Request) {
  const { message, conversationId, filters } = await request.json()

  // 1. Retrieve relevant context
  const startTime = Date.now()
  const context = await retrieveContext(message, filters?.documentIds)
  const retrievalTime = Date.now() - startTime

  // 2. Build prompt with context
  const { systemPrompt, formattedContext, sources } = buildRAGPrompt(context)

  // 3. Stream response
  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages: [{ role: 'user', content: message }],
    maxTokens: 1500,
    onFinish: async ({ text }) => {
      // Log performance metrics
      await logQueryMetrics({
        conversationId,
        query: message,
        retrievalLatencyMs: retrievalTime,
        generationLatencyMs: Date.now() - startTime - retrievalTime,
        chunksRetrieved: context.map(c => c.id),
      })
    },
  })

  return result.toDataStreamResponse({
    // Include sources and confidence after streaming
    getErrorMessage: (error) => 'An error occurred. Please try again.',
  })
}
```

### RAG Prompt Builder

```typescript
// src/lib/rag.ts
const SYSTEM_PROMPT = `You are a helpful assistant for a knowledge base system.

Answer questions based ONLY on the provided context. If the context doesn't contain enough information, say so clearly.

IMPORTANT RULES:
1. Always cite your sources using [1], [2], etc. matching the source numbers provided.
2. If sources conflict, acknowledge the discrepancy.
3. If confidence is low, warn the user.
4. Never make up information not in the sources.
5. Be concise but thorough.

Context:
{context}

Sources are numbered [1], [2], etc. Reference which source(s) support each claim.`

export function buildRAGPrompt(chunks: ChunkWithContext[]) {
  const sources = chunks.map((chunk, i) => ({
    index: i + 1,
    documentId: chunk.documentId,
    documentTitle: chunk.documentTitle,
    content: chunk.content,
    pageNumber: chunk.pageNumber,
    sectionHeader: chunk.sectionHeader,
    similarity: chunk.combinedScore,
  }))

  const formattedContext = chunks
    .map((chunk, i) => `[${i + 1}] ${chunk.sectionHeader ? `(${chunk.sectionHeader}) ` : ''}${chunk.content}`)
    .join('\n\n')

  return {
    systemPrompt: SYSTEM_PROMPT.replace('{context}', formattedContext),
    formattedContext,
    sources,
  }
}
```

### Streaming Response with Metadata

```typescript
// Extended streaming with sources
import { createDataStream } from 'ai'

export async function POST(request: Request) {
  const dataStream = createDataStream({
    execute: async (dataStream) => {
      // Retrieve context first
      const context = await retrieveContext(message)
      const { systemPrompt, sources } = buildRAGPrompt(context)

      // Send sources early
      dataStream.writeData({ type: 'sources', sources })

      // Stream LLM response
      const result = await streamText({
        model: openai('gpt-4o-mini'),
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      })

      result.mergeIntoDataStream(dataStream)

      // Send confidence after completion
      dataStream.writeData({
        type: 'confidence',
        confidence: calculateConfidence(context)
      })
    },
    onError: (error) => `Error: ${error.message}`,
  })

  return new Response(dataStream, {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}
```

### FRs Covered

- FR11: Streaming responses for fast feedback
- FR16: Inline citations in answers
- FR17: Performance targets (2s first-token, 5s complete)
- FR18: Partial answer handling on timeout

### References

- [Source: RAG-ENRICHED-SPECS.md#POST-api-chat]
- [Source: RAG-ENRICHED-SPECS.md#LLM-Prompts]
- [Source: architecture.md#Vercel-AI-SDK]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5

### Completion Notes List
- Implemented POST /api/chat endpoint with SSE streaming
- Built RAG prompt system with citation instructions and context formatting
- Created inline citation markers [1], [2] linking to source metadata
- Implemented 30-second generation timeout via Next.js maxDuration
- Metadata (sources, confidence, suggestions) sent as first SSE chunk
- Text chunks streamed progressively with type: 'text' events
- Query metrics logged to query_logs table on completion

### File List
- `src/lib/rag.ts` - RAG prompt builder with citation formatting
- `src/app/api/chat/route.ts` - Streaming chat API with SSE
