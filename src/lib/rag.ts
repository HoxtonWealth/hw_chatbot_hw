import { ChunkWithContext } from './retrieval/pipeline'

const SYSTEM_PROMPT = `You are a helpful assistant for a GTM (Go-to-Market) knowledge base system.

Your job is NOT to simply repeat what the sources say. Your job is to ANSWER THE USER'S QUESTION directly, using the sources as evidence.

Follow this thinking process:

STEP 1 - UNDERSTAND THE QUESTION:
Before answering, identify what the user actually needs:
- Are they asking for a decision? → Give a recommendation with trade-offs
- Are they asking for an explanation? → Explain clearly in simple terms
- Are they asking for a comparison? → Structure your answer as a comparison
- Are they asking for a process? → Give clear steps
- Are they exploring a topic? → Give a structured overview with key takeaways

STEP 2 - SYNTHESIZE AN ANSWER:
Lead with a direct answer to their question. Don't start with "According to document X...". Start with the actual answer, insight, or recommendation.

STEP 3 - SUPPORT WITH EVIDENCE:
Back up your answer with specific evidence from the sources using [1], [2], etc. Weave citations naturally into your response.

RULES:
- Always lead with the direct answer or key insight FIRST
- Use the provided context as evidence, not as the structure of your response
- If sources conflict, explain the tension and what it means for the user
- If confidence is low, say so and explain what information is missing
- Never make up information not in the sources
- Use markdown formatting when it helps readability
- Be conversational and clear — avoid academic or textbook tone
- If the context doesn't contain enough information to answer, say so clearly

Context:
{context}

Sources are numbered [1], [2], etc. Reference which source(s) support each claim.`

export interface Source {
  index: number
  documentId: string
  documentTitle?: string
  content: string
  pageNumber: number | null
  sectionHeader: string | null
  similarity: number
}

export interface RAGPromptResult {
  systemPrompt: string
  formattedContext: string
  sources: Source[]
  confidence: number
}

export function buildRAGPrompt(chunks: ChunkWithContext[]): RAGPromptResult {
  const sources: Source[] = chunks.map((chunk, i) => ({
    index: i + 1,
    documentId: chunk.document_id,
    documentTitle: chunk.document_title,
    content: chunk.content,
    pageNumber: chunk.page_number,
    sectionHeader: chunk.section_header,
    similarity: chunk.combined_score,
  }))

  const formattedContext = chunks
    .map((chunk, i) => {
      const header = chunk.section_header ? `(${chunk.section_header}) ` : ''
      const page = chunk.page_number ? ` [Page ${chunk.page_number}]` : ''
      return `[${i + 1}]${page} ${header}${chunk.content}`
    })
    .join('\n\n---\n\n')

  // Calculate confidence based on similarity scores
  const avgSimilarity = chunks.length > 0
    ? chunks.reduce((sum, c) => sum + c.combined_score, 0) / chunks.length
    : 0

  const confidence = Math.min(Math.round(avgSimilarity * 100), 100)

  return {
    systemPrompt: SYSTEM_PROMPT.replace('{context}', formattedContext),
    formattedContext,
    sources,
    confidence,
  }
}

// Build prompt for empty/no results case
export function buildEmptyContextPrompt(): string {
  return `You are a helpful assistant for a GTM knowledge base system.

The knowledge base is currently empty or no relevant documents were found for this query.

Please let the user know that:
1. No relevant documents were found for their query
2. They should try uploading documents first, or
3. Try rephrasing their question

Be helpful and suggest what types of documents they might want to upload.`
}

// Build follow-up suggestions
export function generateFollowUpSuggestions(
  query: string,
  chunks: ChunkWithContext[]
): string[] {
  // Simple follow-up suggestions based on context
  const suggestions: string[] = []

  if (chunks.length > 0) {
    const headers = chunks
      .map(c => c.section_header)
      .filter((h): h is string => !!h)

    if (headers.length > 0) {
      suggestions.push(`Tell me more about ${headers[0]}`)
    }

    suggestions.push('What are the key takeaways?')
    suggestions.push('Can you summarize the main points?')
  }

  return suggestions.slice(0, 3)
}
