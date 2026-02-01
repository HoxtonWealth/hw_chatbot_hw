import { expandQuery } from './query-expansion'
import { hybridSearch, SearchResult } from './hybrid'
import { rerank, RankedResult } from './reranker'
import { supabaseAdmin } from '@/lib/supabase'
import { RETRIEVAL_CONFIG } from './config'

export interface ChunkWithContext extends RankedResult {
  document_title?: string
  parent_summary?: string
}

export interface RetrievalResult {
  chunks: ChunkWithContext[]
  queryVariants: string[]
  totalCandidates: number
}

// Deduplicate and merge results from multiple queries
function deduplicateAndMerge(allResults: SearchResult[][]): SearchResult[] {
  const seen = new Map<string, SearchResult>()

  for (const results of allResults) {
    for (const result of results) {
      const existing = seen.get(result.id)
      if (existing) {
        // Keep the higher score
        if (result.combined_score > existing.combined_score) {
          seen.set(result.id, result)
        }
      } else {
        seen.set(result.id, result)
      }
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => b.combined_score - a.combined_score)
}

// Apply MMR for diversity
function applyMMR(
  results: RankedResult[],
  diversityFactor: number = RETRIEVAL_CONFIG.diversityFactor,
  topK: number = RETRIEVAL_CONFIG.topK
): RankedResult[] {
  if (results.length <= topK) return results

  const selected: RankedResult[] = []
  const remaining = [...results]

  // Select highest scoring first
  selected.push(remaining.shift()!)

  while (selected.length < topK && remaining.length > 0) {
    let bestIdx = 0
    let bestScore = -Infinity

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i]

      // Simple text-based diversity (content overlap)
      const maxOverlap = Math.max(
        ...selected.map(s => textOverlap(candidate.content, s.content))
      )

      // MMR score = relevance - diversity_factor * max_overlap
      const mmrScore = candidate.rerank_score - diversityFactor * maxOverlap

      if (mmrScore > bestScore) {
        bestScore = mmrScore
        bestIdx = i
      }
    }

    selected.push(remaining.splice(bestIdx, 1)[0])
  }

  return selected
}

// Simple text overlap score
function textOverlap(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/))
  const wordsB = new Set(b.toLowerCase().split(/\s+/))
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length
  return intersection / Math.max(wordsA.size, wordsB.size)
}

// Get parent context for a chunk
async function getParentContext(chunkId: string): Promise<{
  document_title?: string
  parent_summary?: string
}> {
  try {
    const { data } = await supabaseAdmin.rpc('get_chunk_with_parents', {
      chunk_id: chunkId,
    })

    if (!data || data.length === 0) return {}

    const docLevel = data.find((d: { level: string }) => d.level === 'document')
    const sectionLevel = data.find((d: { level: string }) => d.level === 'section')

    return {
      document_title: docLevel?.summary?.slice(0, 100),
      parent_summary: sectionLevel?.summary,
    }
  } catch {
    return {}
  }
}

export async function retrieveContext(
  query: string,
  documentIds?: string[],
  options: {
    expandQueries?: boolean
    useReranking?: boolean
    topK?: number
    diversityFactor?: number
  } = {}
): Promise<RetrievalResult> {
  const {
    expandQueries = RETRIEVAL_CONFIG.expandQueries,
    useReranking = RETRIEVAL_CONFIG.useReranking,
    topK = RETRIEVAL_CONFIG.topK,
    diversityFactor = RETRIEVAL_CONFIG.diversityFactor,
  } = options

  // 1. Expand query (optional)
  const queryVariants = expandQueries
    ? await expandQuery(query)
    : [query]

  // 2. Search all variants
  const allResults = await Promise.all(
    queryVariants.map(q => hybridSearch({ query: q, documentIds }))
  )

  // 3. Merge and deduplicate
  const merged = deduplicateAndMerge(allResults)
  const totalCandidates = merged.length

  // 4. Rerank (optional)
  const reranked = useReranking
    ? await rerank(merged, query)
    : merged.map(r => ({ ...r, rerank_score: r.combined_score }))

  // 5. Apply MMR for diversity
  const diverse = applyMMR(reranked, diversityFactor, topK)

  // 6. Get parent context
  const chunksWithContext = await Promise.all(
    diverse.map(async (chunk) => {
      const parentContext = await getParentContext(chunk.id)
      return { ...chunk, ...parentContext }
    })
  )

  return {
    chunks: chunksWithContext,
    queryVariants,
    totalCandidates,
  }
}
