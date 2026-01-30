# Story 3.2: Query Expansion & Re-ranking

Status: review

## Story

As a **system**,
I want **to expand queries and re-rank results**,
so that **the most relevant chunks are selected**.

## Acceptance Criteria

1. Query expansion generates 3 query variants via LLM
2. All variants searched and results merged
3. Re-ranking applied to combined results
4. MMR (Maximal Marginal Relevance) for diversity
5. Final top 5 chunks selected
6. Parent chunk context retrieved

## Tasks / Subtasks

- [ ] Task 1: Implement query expansion (AC: 1)
  - [ ] Create `src/lib/retrieval/query-expansion.ts`
  - [ ] Use gpt-4o-mini for variant generation
  - [ ] Generate 3 alternative phrasings
  - [ ] Return original + variants array

- [ ] Task 2: Implement result merging (AC: 2)
  - [ ] Search with all query variants
  - [ ] Merge and deduplicate results
  - [ ] Combine scores from multiple queries
  - [ ] Handle duplicate chunks from different variants

- [ ] Task 3: Implement re-ranking (AC: 3)
  - [ ] Create `src/lib/retrieval/reranker.ts`
  - [ ] Use LLM-based re-ranking
  - [ ] Score relevance of each chunk to original query
  - [ ] Return re-ordered results

- [ ] Task 4: Implement MMR diversity (AC: 4)
  - [ ] Create `src/lib/retrieval/mmr.ts`
  - [ ] Calculate diversity between chunks
  - [ ] Apply diversity factor (0.3)
  - [ ] Balance relevance vs diversity

- [ ] Task 5: Implement parent retrieval (AC: 6)
  - [ ] Use `get_chunk_with_parents` database function
  - [ ] Retrieve section and document summaries
  - [ ] Include parent context in final results

- [ ] Task 6: Integrate into retrieval pipeline (AC: 5)
  - [ ] Create `src/lib/retrieval/pipeline.ts`
  - [ ] Chain: expand → search → merge → rerank → MMR → parents
  - [ ] Return final top 5 chunks with full context

## Dev Notes

### Query Expansion

```typescript
// src/lib/retrieval/query-expansion.ts
import { openai } from '@/lib/openai'

const EXPANSION_PROMPT = `Given this search query, generate 3 alternative phrasings that might help find relevant information. Focus on:
1. Synonyms and related terms
2. More specific versions
3. More general versions

Query: {query}

Return as JSON array of strings only.`

export async function expandQuery(query: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: EXPANSION_PROMPT.replace('{query}', query) }
    ],
    response_format: { type: 'json_object' },
  })

  const content = JSON.parse(response.choices[0].message.content || '{}')
  const variants = content.variants || content.queries || []

  return [query, ...variants.slice(0, 3)]
}
```

### MMR Implementation

```typescript
// src/lib/retrieval/mmr.ts
interface Chunk {
  id: string
  content: string
  embedding: number[]
  score: number
}

export function applyMMR(
  chunks: Chunk[],
  diversityFactor: number = 0.3,
  topK: number = 5
): Chunk[] {
  if (chunks.length <= topK) return chunks

  const selected: Chunk[] = []
  const remaining = [...chunks]

  // Select highest scoring chunk first
  selected.push(remaining.shift()!)

  while (selected.length < topK && remaining.length > 0) {
    let bestScore = -Infinity
    let bestIdx = 0

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i]

      // Calculate max similarity to already selected chunks
      const maxSim = Math.max(
        ...selected.map(s => cosineSimilarity(candidate.embedding, s.embedding))
      )

      // MMR score = relevance - diversity_factor * max_similarity
      const mmrScore = candidate.score - diversityFactor * maxSim

      if (mmrScore > bestScore) {
        bestScore = mmrScore
        bestIdx = i
      }
    }

    selected.push(remaining.splice(bestIdx, 1)[0])
  }

  return selected
}
```

### Retrieval Pipeline

```typescript
// src/lib/retrieval/pipeline.ts
import { expandQuery } from './query-expansion'
import { hybridSearch } from './hybrid'
import { rerank } from './reranker'
import { applyMMR } from './mmr'
import { getChunkWithParents } from './parents'

export async function retrieveContext(query: string, documentIds?: string[]) {
  // 1. Expand query
  const queryVariants = await expandQuery(query)

  // 2. Search all variants and merge
  const allResults = await Promise.all(
    queryVariants.map(q => hybridSearch({ query: q, documentIds }))
  )
  const merged = deduplicateAndMerge(allResults)

  // 3. Re-rank
  const reranked = await rerank(merged, query)

  // 4. Apply MMR
  const diverse = applyMMR(reranked, 0.3, 5)

  // 5. Get parent context
  const withContext = await Promise.all(
    diverse.map(chunk => getChunkWithParents(chunk.id))
  )

  return withContext
}
```

### FRs Covered

- FR14: Query expansion and re-ranking for better retrieval

### References

- [Source: RAG-ENRICHED-SPECS.md#Retrieval-Pipeline]
- [Source: RAG-ENRICHED-SPECS.md#Retrieval-Config]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5

### Completion Notes List
- Implemented query expansion using gpt-4o-mini to generate 3 query variants
- Created reranker using LLM-based relevance scoring (0-10 scale)
- Implemented MMR for diversity with 0.3 diversity factor
- Built complete retrieval pipeline chaining: expand → search → merge → rerank → MMR
- Pipeline returns top 5 chunks with combined scores and parent context
- Integrated with hybrid search from Story 3-1

### File List
- `src/lib/retrieval/query-expansion.ts` - Query variant generation
- `src/lib/retrieval/reranker.ts` - LLM-based re-ranking
- `src/lib/retrieval/pipeline.ts` - Complete retrieval pipeline with MMR
