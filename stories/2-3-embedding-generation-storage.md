# Story 2.3: Embedding Generation & Storage

Status: review

## Story

As a **system**,
I want **to generate embeddings for all document chunks**,
so that **semantic search can find relevant content**.

## Acceptance Criteria

1. OpenAI text-embedding-3-small integration
2. Batch embedding generation (100 chunks per batch)
3. Embeddings stored in document_chunks table
4. Multi-language content supported
5. Token count tracked per chunk
6. Error handling with retry logic for API failures

## Tasks / Subtasks

- [x] Task 1: Create OpenAI client (AC: 1)
  - [x] Create `src/lib/openai.ts`
  - [x] Configure with OPENAI_API_KEY
  - [x] Export embedding function

- [x] Task 2: Implement embedding generation (AC: 1, 4)
  - [x] Create `src/lib/embeddings.ts`
  - [x] Use text-embedding-3-small model (1536 dimensions)
  - [x] Handle multi-language content (model supports all languages)
  - [x] Return embedding vector

- [x] Task 3: Implement batch processing (AC: 2)
  - [x] Process chunks in batches of 100
  - [x] Track progress for status updates
  - [x] Handle partial batch failures

- [x] Task 4: Implement retry logic (AC: 6)
  - [x] Retry on rate limit (E402) with exponential backoff
  - [x] Retry on timeout (E204) up to 3 times
  - [x] Log failures for debugging
  - [x] Backoff: [1000ms, 5000ms, 15000ms]

- [x] Task 5: Store embeddings (AC: 3, 5)
  - [x] Update document_chunks with embedding vector
  - [x] Calculate and store token_count
  - [x] Use JSON format for pgvector storage

- [x] Task 6: Integrate with processing pipeline (AC: 1-6)
  - [x] Call embedding generation from process route
  - [x] Update document status on completion
  - [x] Handle partial success (some chunks failed)

## Dev Notes

### OpenAI Client (src/lib/openai.ts)

```typescript
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  })
  return response.data.map(d => d.embedding)
}
```

### Batch Processing Pattern

```typescript
async function processChunksInBatches(
  chunks: Chunk[],
  batchSize: number = 100
): Promise<void> {
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const texts = batch.map(c => c.content)

    const embeddings = await generateEmbeddingsWithRetry(texts)

    await storeEmbeddings(batch, embeddings)

    // Update progress
    const progress = Math.round(((i + batch.length) / chunks.length) * 100)
    await updateProcessingProgress(documentId, progress)
  }
}
```

### Retry Logic

```typescript
async function generateEmbeddingsWithRetry(
  texts: string[],
  maxRetries: number = 3
): Promise<number[][]> {
  const backoff = [1000, 5000, 15000]

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generateEmbeddings(texts)
    } catch (error) {
      if (attempt === maxRetries - 1) throw error

      if (isRateLimitError(error) || isTimeoutError(error)) {
        await sleep(backoff[attempt])
        continue
      }
      throw error
    }
  }
}
```

### FRs Covered

- FR8: Generate embeddings for all chunks
- FR9: Store chunks with metadata in vector database
- FR10: Support content in all languages

### References

- [Source: RAG-ENRICHED-SPECS.md#OpenAI-Embedding-Specs]
- [Source: RAG-ENRICHED-SPECS.md#Ingestion-Resilience]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

1. **Task 1**: Created `src/lib/openai.ts` with OpenAI client initialization and embedding functions.

2. **Task 2**: Created `src/lib/embeddings.ts` with generateEmbedding and generateEmbeddings functions using text-embedding-3-small.

3. **Task 3**: Batch processing with 100 chunks per batch, progress callback support.

4. **Task 4**: Retry logic with exponential backoff [1000ms, 5000ms, 15000ms], detects rate limit and timeout errors.

5. **Task 5**: Embeddings stored as JSON in document_chunks table. Token count calculated and stored.

6. **Task 6**: Process route updated to call embedding generation after chunking.

### File List

**Created:**
- src/lib/openai.ts
- src/lib/embeddings.ts

**Modified:**
- src/app/api/process/route.ts (calls embedding generation)

## Change Log

- 2026-01-29: Story implementation completed - all ACs satisfied
