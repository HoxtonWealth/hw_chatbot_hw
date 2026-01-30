import { openai } from '@/lib/openai'
import { SearchResult } from './hybrid'

const RERANK_PROMPT = `Given the query and document excerpts below, rate each excerpt's relevance from 0 to 10.

Query: {query}

Excerpts:
{excerpts}

Return JSON: { "scores": [score1, score2, ...] } with one score per excerpt.`

export interface RankedResult extends SearchResult {
  rerank_score: number
}

export async function rerank(
  results: SearchResult[],
  query: string
): Promise<RankedResult[]> {
  if (results.length === 0) return []
  if (results.length <= 5) {
    // No need to rerank if we have 5 or fewer
    return results.map((r, i) => ({
      ...r,
      rerank_score: r.combined_score,
    }))
  }

  try {
    const excerpts = results
      .map((r, i) => `[${i + 1}] ${r.content.slice(0, 200)}...`)
      .join('\n\n')

    const response = await openai.chat.completions.create({
      model: process.env.CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: RERANK_PROMPT
            .replace('{query}', query)
            .replace('{excerpts}', excerpts)
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 200,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No rerank response')

    const parsed = JSON.parse(content)
    const scores: number[] = parsed.scores || []

    // Apply rerank scores and sort
    const reranked = results.map((r, i) => ({
      ...r,
      rerank_score: (scores[i] || 5) / 10, // Normalize to 0-1
    }))

    return reranked.sort((a, b) => b.rerank_score - a.rerank_score)
  } catch (error) {
    console.error('Reranking error:', error)
    // Fallback to original order
    return results.map(r => ({ ...r, rerank_score: r.combined_score }))
  }
}
