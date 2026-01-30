import React from 'react'
import { GlossaryTerm } from '@/components/chat/GlossaryTerm'
import { GlossaryEntry } from '@/lib/supabase'

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Scans text for glossary terms and returns an array of ReactNode
 * where matched terms are wrapped in GlossaryTerm components.
 * Terms are sorted by length (longest first) for greedy matching.
 */
export function highlightGlossaryTerms(
  text: string,
  glossary: GlossaryEntry[]
): React.ReactNode[] {
  if (!glossary.length || !text) {
    return [text]
  }

  // Sort by term length descending for greedy matching
  const sorted = [...glossary].sort((a, b) => b.term.length - a.term.length)

  // Build a single regex with all terms using word boundaries
  const pattern = sorted.map((entry) => escapeRegex(entry.term)).join('|')
  const regex = new RegExp(`\\b(${pattern})\\b`, 'gi')

  // Build a lookup map (lowercase term -> entry) for fast access
  const lookup = new Map<string, GlossaryEntry>()
  for (const entry of sorted) {
    lookup.set(entry.term.toLowerCase(), entry)
  }

  const result: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const matchedText = match[0]
    const index = match.index

    // Add preceding text
    if (index > lastIndex) {
      result.push(text.slice(lastIndex, index))
    }

    // Find the glossary entry for this match
    const entry = lookup.get(matchedText.toLowerCase())
    if (entry) {
      result.push(
        React.createElement(GlossaryTerm, {
          key: `glossary-${index}`,
          term: matchedText,
          definition: entry.definition,
          sourceDocument: entry.documents?.title || undefined,
        })
      )
    } else {
      result.push(matchedText)
    }

    lastIndex = index + matchedText.length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }

  return result
}
