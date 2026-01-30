import { supabaseAdmin } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'

export interface HybridSearchParams {
  query: string
  documentIds?: string[]
  limit?: number
  threshold?: number
}

export interface SearchResult {
  id: string
  document_id: string
  content: string
  summary: string | null
  page_number: number | null
  section_header: string | null
  similarity: number
  keyword_score: number
  combined_score: number
}

export async function hybridSearch({
  query,
  documentIds,
  limit = 20,
  threshold = 0.5,
}: HybridSearchParams): Promise<SearchResult[]> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query)

  // Call hybrid search function
  const { data, error } = await supabaseAdmin.rpc('match_chunks_hybrid', {
    query_embedding: JSON.stringify(queryEmbedding),
    query_text: query,
    match_count: limit,
    similarity_threshold: threshold,
    filter_document_ids: documentIds || null,
    use_mmr: false,
    mmr_diversity: 0.3,
  })

  if (error) {
    console.error('Hybrid search error:', error)
    throw new Error(`Search failed: ${error.message}`)
  }

  return (data || []) as SearchResult[]
}

// Simple vector-only search as fallback
export async function vectorSearch({
  query,
  documentIds,
  limit = 20,
  threshold = 0.5,
}: HybridSearchParams): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query)

  // Direct vector search query
  let queryBuilder = supabaseAdmin
    .from('document_chunks')
    .select('id, document_id, content, summary, page_number, section_header')
    .eq('level', 'chunk')
    .not('embedding', 'is', null)
    .limit(limit)

  if (documentIds && documentIds.length > 0) {
    queryBuilder = queryBuilder.in('document_id', documentIds)
  }

  const { data, error } = await queryBuilder

  if (error) {
    console.error('Vector search error:', error)
    throw new Error(`Search failed: ${error.message}`)
  }

  // Note: In production, use pgvector similarity. This is a fallback.
  return (data || []).map(chunk => ({
    ...chunk,
    similarity: 0.5, // Placeholder - actual similarity would be calculated by DB
    keyword_score: 0,
    combined_score: 0.5,
  })) as SearchResult[]
}
