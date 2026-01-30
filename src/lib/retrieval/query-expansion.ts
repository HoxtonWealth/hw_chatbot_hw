import { openai } from '@/lib/openai'

const EXPANSION_PROMPT = `Given this search query, generate 3 alternative phrasings that might help find relevant information. Focus on:
1. Synonyms and related terms
2. More specific versions
3. More general versions

Query: {query}

Return as JSON: { "variants": ["variant1", "variant2", "variant3"] }`

export async function expandQuery(query: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'user', content: EXPANSION_PROMPT.replace('{query}', query) }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 200,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return [query]

    const parsed = JSON.parse(content)
    const variants = parsed.variants || parsed.queries || []

    return [query, ...variants.slice(0, 3)]
  } catch (error) {
    console.error('Query expansion error:', error)
    return [query] // Fallback to original query
  }
}
