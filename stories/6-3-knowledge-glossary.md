# Story 6.3: Knowledge Glossary

Status: review

## Story

As a **user**,
I want **domain terms auto-extracted and defined**,
so that **I can understand jargon in answers**.

## Acceptance Criteria

1. Term extraction during document processing
2. Glossary table with terms and definitions
3. Hover definitions for recognized terms in answers
4. Glossary API endpoint

## Tasks / Subtasks

- [x] Task 1: Create glossary extraction service (AC: 1)
  - [x] Create `src/lib/glossary.ts`
  - [x] Extract potential terms during document processing via LLM
  - [x] Use gpt-4o-mini to generate definitions
  - [x] Store in glossary table via upsert
  - [x] Mark as auto_extracted=true

- [x] Task 2: Create glossary API (AC: 4)
  - [x] Create `src/app/api/glossary/route.ts`
  - [x] GET: Return all terms with definitions
  - [x] Support search/filter by term (ilike)
  - [x] Include source document reference via join

- [x] Task 3: Create GlossaryTerm component (AC: 3)
  - [x] Create `src/components/chat/GlossaryTerm.tsx`
  - [x] CSS-based hover tooltip (no extra shadcn dependency)
  - [x] Show definition on hover
  - [x] Include source document badge

- [x] Task 4: Implement term detection in answers (AC: 3)
  - [x] Create `src/lib/glossary-highlighter.ts`
  - [x] Parse answer text for known terms
  - [x] Wrap terms in GlossaryTerm component via React.createElement
  - [x] Case-insensitive matching with word boundaries

- [x] Task 5: Create glossary page (AC: 2)
  - [x] Create `src/app/glossary/page.tsx`
  - [x] Table view of all terms with definitions and sources
  - [x] Search/filter functionality (client-side)
  - [x] Link to source documents via badge
  - [x] Add "Glossary" to AppHeader navigation

- [x] Task 6: Integrate with processing pipeline (AC: 1)
  - [x] `extractGlossaryTerms` called from `src/app/api/process/route.ts`
  - [x] Deduplicate existing terms via upsert with ignoreDuplicates
  - [x] ChatInterface fetches glossary terms on mount and passes to ChatMessage

## Dev Notes

### Glossary Extraction Service

```typescript
// src/lib/glossary.ts
import { openai } from '@/lib/openai'
import { supabase } from '@/lib/supabase'

const EXTRACTION_PROMPT = `Extract domain-specific terms and jargon from the following text.
For each term, provide a clear, concise definition.

Text:
{content}

Return as JSON array:
[
  { "term": "example term", "definition": "brief definition" }
]

Only include actual domain-specific terms, not common words.
Limit to the 5 most important terms.`

interface ExtractedTerm {
  term: string
  definition: string
}

export async function extractGlossaryTerms(
  content: string,
  documentId: string
): Promise<ExtractedTerm[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: EXTRACTION_PROMPT.replace('{content}', content) }
    ],
    response_format: { type: 'json_object' },
  })

  const result = JSON.parse(response.choices[0].message.content || '{}')
  const terms: ExtractedTerm[] = result.terms || []

  // Store in database, avoiding duplicates
  for (const term of terms) {
    const { error } = await supabase
      .from('glossary')
      .upsert({
        term: term.term.toLowerCase(),
        definition: term.definition,
        source_document_id: documentId,
        auto_extracted: true,
      }, {
        onConflict: 'term',
        ignoreDuplicates: true, // Keep existing definition
      })

    if (error) console.error('Glossary insert error:', error)
  }

  return terms
}

export async function getGlossary(): Promise<GlossaryEntry[]> {
  const { data, error } = await supabase
    .from('glossary')
    .select('*, documents(title)')
    .order('term')

  if (error) throw error
  return data
}
```

### Glossary API

```typescript
// src/app/api/glossary/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search')

  let query = supabase
    .from('glossary')
    .select('id, term, definition, source_document_id, documents(title)')
    .order('term')

  if (search) {
    query = query.ilike('term', `%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    terms: data,
    count: data.length,
  })
}
```

### GlossaryTerm Component

```typescript
// src/components/common/GlossaryTerm.tsx
'use client'

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Badge } from '@/components/ui/badge'
import { BookOpen } from 'lucide-react'

interface GlossaryTermProps {
  term: string
  definition: string
  sourceDocument?: string
}

export function GlossaryTerm({ term, definition, sourceDocument }: GlossaryTermProps) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="underline decoration-dotted decoration-primary cursor-help">
          {term}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="font-semibold">{term}</span>
          </div>
          <p className="text-sm text-muted-foreground">{definition}</p>
          {sourceDocument && (
            <Badge variant="outline" className="text-xs">
              Source: {sourceDocument}
            </Badge>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
```

### Glossary Highlighter

```typescript
// src/lib/glossary-highlighter.ts
import { ReactNode } from 'react'
import { GlossaryTerm } from '@/components/common/GlossaryTerm'

interface GlossaryEntry {
  term: string
  definition: string
  sourceDocument?: string
}

export function highlightGlossaryTerms(
  text: string,
  glossary: GlossaryEntry[]
): ReactNode[] {
  if (glossary.length === 0) return [text]

  // Sort by term length (longest first) to match longer phrases first
  const sortedTerms = [...glossary].sort((a, b) => b.term.length - a.term.length)

  // Create regex pattern for all terms
  const pattern = new RegExp(
    `\\b(${sortedTerms.map(t => escapeRegex(t.term)).join('|')})\\b`,
    'gi'
  )

  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    // Find matching glossary entry
    const matchedTerm = match[1]
    const entry = glossary.find(
      g => g.term.toLowerCase() === matchedTerm.toLowerCase()
    )

    if (entry) {
      parts.push(
        <GlossaryTerm
          key={`${match.index}-${matchedTerm}`}
          term={matchedTerm}
          definition={entry.definition}
          sourceDocument={entry.sourceDocument}
        />
      )
    } else {
      parts.push(matchedTerm)
    }

    lastIndex = pattern.lastIndex
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
```

### FRs Covered

- FR36: Auto-extract domain terms during document processing
- FR37: Hover definitions for glossary terms in answers

### References

- [Source: RAG-ENRICHED-SPECS.md#Glossary-Table]
- [Source: RAG-ENRICHED-SPECS.md#Metadata-Enrichment]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List
- All 6 tasks completed and verified
- Glossary extraction integrated into document processing pipeline
- GlossaryTerm uses pure CSS hover tooltip (avoids shadcn HoverCard dependency)
- Glossary highlighter uses greedy regex matching (longest terms first)
- ChatMessage renders glossary-highlighted text for assistant messages
- Glossary page added with search, table view, and source document badges
- "Glossary" nav item added to AppHeader
- TypeScript check and Next.js build pass clean

### File List
**New files:**
- `src/app/glossary/page.tsx` — Glossary browsing page with search and table

**Existing files (already implemented):**
- `src/lib/glossary.ts` — Term extraction service with LLM
- `src/lib/glossary-highlighter.ts` — Term detection and highlighting in answers
- `src/components/chat/GlossaryTerm.tsx` — Hover tooltip component
- `src/app/api/glossary/route.ts` — GET API with search support

**Modified files:**
- `src/components/layout/AppHeader.tsx` — Added "Glossary" nav item
