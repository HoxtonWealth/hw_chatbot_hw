import { openai } from '@/lib/openai'
import { supabaseAdmin, GlossaryEntry } from '@/lib/supabase'

export interface ExtractedTerm {
  term: string
  definition: string
}

/**
 * Extract domain-specific glossary terms from document content using LLM.
 * Upserts extracted terms into the glossary table.
 */
export async function extractGlossaryTerms(
  content: string,
  documentId: string
): Promise<ExtractedTerm[]> {
  const prompt = `You are a domain-specific terminology extractor. Analyze the following text and extract up to 5 important domain-specific terms with clear, concise definitions.

Rules:
- Only extract terms that are specific to the domain/industry discussed in the text
- Do not extract common English words or generic phrases
- Definitions should be 1-2 sentences, clear and self-contained
- Return valid JSON only

Return a JSON object with this exact structure:
{
  "terms": [
    { "term": "Example Term", "definition": "A clear definition of the term." }
  ]
}

Text to analyze:
${content.slice(0, 4000)}
`

  const response = await openai.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You extract domain-specific terminology. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  })

  const raw = response.choices[0]?.message?.content?.trim() || '{}'

  let terms: ExtractedTerm[] = []
  try {
    // Handle potential markdown code fences in response
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned)
    terms = Array.isArray(parsed.terms) ? parsed.terms : []
  } catch {
    console.error('Failed to parse glossary extraction response:', raw)
    return []
  }

  // Filter out invalid entries
  terms = terms.filter(
    (t) => t.term && typeof t.term === 'string' && t.definition && typeof t.definition === 'string'
  )

  // Upsert terms into glossary table (ignore duplicates on conflict)
  for (const t of terms) {
    const { error } = await supabaseAdmin
      .from('glossary')
      .upsert(
        {
          term: t.term,
          definition: t.definition,
          source_document_id: documentId,
          auto_extracted: true,
        },
        { onConflict: 'term', ignoreDuplicates: true }
      )

    if (error) {
      console.error(`Failed to upsert glossary term "${t.term}":`, error)
    }
  }

  return terms
}

/**
 * Fetch all glossary entries, ordered alphabetically by term.
 */
export async function getGlossary(): Promise<GlossaryEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('glossary')
    .select('*')
    .order('term', { ascending: true })

  if (error) {
    console.error('Failed to fetch glossary:', error)
    return []
  }

  return data || []
}
