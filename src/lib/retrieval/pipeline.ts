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

// Batch get parent context for multiple chunks (3 queries instead of N RPCs)
async function batchGetParentContext(
  chunkIds: string[]
): Promise<Map<string, { document_title?: string; parent_summary?: string }>> {
  const result = new Map<string, { document_title?: string; parent_summary?: string }>()
  if (chunkIds.length === 0) return result

  try {
    // 1. Get chunks' parent_chunk_id values
    const { data: chunks } = await supabaseAdmin
      .from('document_chunks')
      .select('id, parent_chunk_id')
      .in('id', chunkIds)

    if (!chunks || chunks.length === 0) return result

    // Collect parent IDs (section-level)
    const sectionParentIds = chunks
      .map((c: { parent_chunk_id: string | null }) => c.parent_chunk_id)
      .filter((id): id is string => id !== null)

    // Build chunk -> section parent mapping
    const chunkToSectionParent = new Map<string, string>()
    for (const chunk of chunks) {
      if (chunk.parent_chunk_id) {
        chunkToSectionParent.set(chunk.id, chunk.parent_chunk_id)
      }
    }

    // 2. Get section-level parents (and their parent IDs for document level)
    let sectionMap = new Map<string, { summary?: string; parent_chunk_id?: string }>()
    if (sectionParentIds.length > 0) {
      const { data: sections } = await supabaseAdmin
        .from('document_chunks')
        .select('id, content, parent_chunk_id')
        .in('id', sectionParentIds)

      if (sections) {
        for (const section of sections) {
          sectionMap.set(section.id, {
            summary: section.content,
            parent_chunk_id: section.parent_chunk_id,
          })
        }
      }
    }

    // 3. Get document-level parents
    const docParentIds = [...sectionMap.values()]
      .map(s => s.parent_chunk_id)
      .filter((id): id is string => id !== null && id !== undefined)

    let docMap = new Map<string, string>()
    if (docParentIds.length > 0) {
      const { data: docs } = await supabaseAdmin
        .from('document_chunks')
        .select('id, content')
        .in('id', docParentIds)

      if (docs) {
        for (const doc of docs) {
          docMap.set(doc.id, doc.content)
        }
      }
    }

    // Assemble results for each chunk
    for (const chunkId of chunkIds) {
      const sectionParentId = chunkToSectionParent.get(chunkId)
      const section = sectionParentId ? sectionMap.get(sectionParentId) : undefined
      const docParentId = section?.parent_chunk_id
      const docContent = docParentId ? docMap.get(docParentId) : undefined

      result.set(chunkId, {
        document_title: docContent?.slice(0, 100),
        parent_summary: section?.summary,
      })
    }
  } catch {
    // Return empty results on error
  }

  return result
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

  // 6. Get parent context (batched: 3 queries instead of N RPCs)
  const parentContextMap = await batchGetParentContext(diverse.map(c => c.id))
  const chunksWithContext = diverse.map((chunk) => ({
    ...chunk,
    ...parentContextMap.get(chunk.id),
  }))

  return {
    chunks: chunksWithContext,
    queryVariants,
    totalCandidates,
  }
}
