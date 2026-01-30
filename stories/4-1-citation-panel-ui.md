# Story 4.1: Citation Panel UI

Status: review

## Story

As a **user**,
I want **to see the sources used for each answer**,
so that **I can verify the information**.

## Acceptance Criteria

1. Collapsible citation panel below each answer
2. Citation cards show: document name, page number, relevance score
3. Source preview text (first 200 chars)
4. Primary source highlighted
5. Click to expand full source context
6. Source count badge on panel header

## Tasks / Subtasks

- [ ] Task 1: Create CitationPanel component (AC: 1, 6)
  - [ ] Create `src/components/citations/CitationPanel.tsx`
  - [ ] Use shadcn Collapsible component
  - [ ] Show source count badge in header
  - [ ] Default collapsed, expandable on click

- [ ] Task 2: Create CitationCard component (AC: 2, 3, 4)
  - [ ] Create `src/components/citations/CitationCard.tsx`
  - [ ] Display document name, page number
  - [ ] Display relevance score as percentage
  - [ ] Show first 200 chars of source text
  - [ ] Highlight primary source with border/badge

- [ ] Task 3: Implement expand functionality (AC: 5)
  - [ ] Add expand button to each card
  - [ ] Show full source content on expand
  - [ ] Use shadcn Dialog or inline expand
  - [ ] Include section header if available

- [ ] Task 4: Create InlineHighlight component (AC: 2)
  - [ ] Create `src/components/citations/InlineHighlight.tsx`
  - [ ] Render citation markers [1], [2] as clickable
  - [ ] Hover shows citation preview
  - [ ] Click scrolls to source in panel

- [ ] Task 5: Style and integrate (AC: 1-6)
  - [ ] Style cards with shadcn Card
  - [ ] Add hover states for interactivity
  - [ ] Integrate with ChatMessage component
  - [ ] Handle empty sources gracefully

## Dev Notes

### CitationPanel Component

```typescript
// src/components/citations/CitationPanel.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { CitationCard } from './CitationCard'

interface Source {
  index: number
  documentId: string
  documentTitle: string
  content: string
  pageNumber?: number
  sectionHeader?: string
  similarity: number
  isPrimary: boolean
}

interface CitationPanelProps {
  sources: Source[]
  isExpanded?: boolean
}

export function CitationPanel({ sources, isExpanded = false }: CitationPanelProps) {
  const [open, setOpen] = useState(isExpanded)

  if (sources.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-4">
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <FileText className="h-4 w-4" />
        <span>Sources</span>
        <Badge variant="secondary" className="ml-1">
          {sources.length}
        </Badge>
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-2">
        {sources.map((source) => (
          <CitationCard key={source.index} source={source} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
```

### CitationCard Component

```typescript
// src/components/citations/CitationCard.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface CitationCardProps {
  source: Source
}

export function CitationCard({ source }: CitationCardProps) {
  const [expanded, setExpanded] = useState(false)

  const preview = source.content.slice(0, 200) + (source.content.length > 200 ? '...' : '')
  const relevancePercent = Math.round(source.similarity * 100)

  return (
    <Card className={source.isPrimary ? 'border-primary' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Badge variant="outline">[{source.index}]</Badge>
            {source.documentTitle}
            {source.isPrimary && (
              <Star className="h-4 w-4 text-primary fill-primary" />
            )}
          </CardTitle>
          <Badge variant="secondary">{relevancePercent}%</Badge>
        </div>
        {(source.pageNumber || source.sectionHeader) && (
          <p className="text-xs text-muted-foreground">
            {source.pageNumber && `Page ${source.pageNumber}`}
            {source.pageNumber && source.sectionHeader && ' · '}
            {source.sectionHeader}
          </p>
        )}
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">
          {expanded ? source.content : preview}
        </p>

        {source.content.length > 200 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="mt-2 p-0 h-auto"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show more
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

### InlineHighlight for Citations

```typescript
// src/components/citations/InlineHighlight.tsx
'use client'

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

interface InlineHighlightProps {
  index: number
  source: Source
  onScrollToSource: () => void
}

export function InlineHighlight({ index, source, onScrollToSource }: InlineHighlightProps) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button
          onClick={onScrollToSource}
          className="text-primary font-medium hover:underline"
        >
          [{index}]
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <p className="text-sm font-medium">{source.documentTitle}</p>
          {source.pageNumber && (
            <p className="text-xs text-muted-foreground">Page {source.pageNumber}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {source.content.slice(0, 150)}...
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
```

### FRs Covered

- FR19: Display sources with document name, page number, relevance
- FR20: Highlight primary source, allow expanding full context

### References

- [Source: RAG-ENRICHED-SPECS.md#Citation-UX-Components]
- [Source: RAG-ENRICHED-SPECS.md#UI-Component-Architecture]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5

### Completion Notes List
- Created CitationPanel component with shadcn Card styling
- Shows document title, relevance score, and preview text
- Click to expand full source content
- Selected source highlighting with ring styling
- Integrated with ChatInterface to show sources alongside responses
- Source selection callback to highlight specific citations

### File List
- `src/components/chat/CitationPanel.tsx` - Citation panel with source cards
- `src/components/chat/ChatInterface.tsx` - Citation integration
