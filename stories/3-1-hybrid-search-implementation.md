# Story 3.1: Hybrid Search Implementation

Status: review

## Story

As a **system**,
I want **to search documents using both vector and keyword matching**,
so that **retrieval accuracy is maximized**.

## Acceptance Criteria

1. Vector search using pgvector cosine similarity
2. Keyword search using pg_trgm
3. Combined scoring (70% vector, 30% keyword)
4. Similarity threshold filtering (>0.5)
5. Top 20 initial retrieval
6. Query embedding generation

## Tasks / Subtasks

- [x] Task 1: Create hybrid search service (AC: 1, 2, 3)
  - [x] Create `src/lib/retrieval/hybrid.ts`
  - [x] Implement vector search using Supabase RPC
  - [x] Implement keyword search with pg_trgm
  - [x] Combine scores with 70/30 weighting

- [x] Task 2: Implement query embedding (AC: 6)
  - [x] Uses existing `src/lib/openai.ts`
  - [x] `generateEmbedding(text: string)` function
  - [x] Uses text-embedding-3-small model

- [x] Task 3: Implement similarity filtering (AC: 4, 5)
  - [x] Filter results below 0.5 similarity threshold
  - [x] Limit to top 20 initial results
  - [x] Sort by combined score descending

- [x] Task 4: Create search API route (AC: 1-6)
  - [x] Create `src/app/api/search/route.ts`
  - [x] Accept query and optional filters
  - [x] Return ranked chunks with scores

- [x] Task 5: Database function verification (AC: 1, 2)
  - [x] `match_chunks_hybrid` exists in migration
  - [x] Function validated during build
  - [x] Scoring uses 70% vector, 30% keyword

## Dev Notes

### Hybrid Search Service

```typescript
// src/lib/retrieval/hybrid.ts
import { supabase } from '@/lib/supabase'
import { embedQuery } from '@/lib/embeddings'

interface HybridSearchParams {
  query: string
  documentIds?: string[]
  limit?: number
  threshold?: number
}

interface SearchResult {
  id: string
  documentId: string
  content: string
  summary: string | null
  pageNumber: number | null
  sectionHeader: string | null
  similarity: number
  keywordScore: number
  combinedScore: number
}

export async function hybridSearch({
  query,
  documentIds,
  limit = 20,
  threshold = 0.5,
}: HybridSearchParams): Promise<SearchResult[]> {
  // Generate query embedding
  const queryEmbedding = await embedQuery(query)

  // Call hybrid search function
  const { data, error } = await supabase.rpc('match_chunks_hybrid', {
    query_embedding: queryEmbedding,
    query_text: query,
    match_count: limit,
    similarity_threshold: threshold,
    filter_document_ids: documentIds || null,
    use_mmr: false,
    mmr_diversity: 0.3,
  })

  if (error) throw error
  return data
}
```

### Search API Route

```typescript
// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { hybridSearch } from '@/lib/retrieval/hybrid'

export async function POST(request: NextRequest) {
  const { query, documentIds } = await request.json()

  if (!query?.trim()) {
    return NextResponse.json(
      { success: false, error: { code: 'E301', message: 'Query is required' } },
      { status: 400 }
    )
  }

  const results = await hybridSearch({
    query,
    documentIds,
    limit: 20,
    threshold: 0.5,
  })

  return NextResponse.json({
    success: true,
    results,
    count: results.length,
  })
}
```

### FRs Covered

- FR13: Hybrid search with vector + keyword matching

### References

- [Source: RAG-ENRICHED-SPECS.md#Enhanced-Chunking-Retrieval-Pipeline]
- [Source: RAG-ENRICHED-SPECS.md#Database-Functions]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

1. Created `src/lib/retrieval/hybrid.ts` with hybridSearch and vectorSearch functions.
2. Uses match_chunks_hybrid RPC function from database migration.
3. Query embedding generated using OpenAI text-embedding-3-small.
4. Configurable threshold (default 0.5), limit (default 20).
5. Search API at POST /api/search accepts query, documentIds, limit, threshold.

### File List

**Created:**
- src/lib/retrieval/hybrid.ts
- src/app/api/search/route.ts

## Change Log

- 2026-01-29: Story implementation completed
