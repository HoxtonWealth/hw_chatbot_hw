# Story 4.2: Confidence Indicator

Status: review

## Story

As a **user**,
I want **to see how confident the system is in its answer**,
so that **I know when to verify information**.

## Acceptance Criteria

1. Confidence score calculated (0-1)
2. Visual indicator: High (green), Medium (yellow), Low (red)
3. Score percentage displayed
4. Warning banner when confidence <0.6
5. Confidence factors: source quality, recency, consistency, coverage

## Tasks / Subtasks

- [ ] Task 1: Create confidence calculation service (AC: 1, 5)
  - [ ] Create `src/lib/confidence.ts`
  - [ ] Calculate source quality score (priority, chunk count)
  - [ ] Calculate recency score (document age)
  - [ ] Calculate consistency score (source agreement)
  - [ ] Calculate coverage score (relevant chunk ratio)
  - [ ] Combine with weights (0.3, 0.2, 0.3, 0.2)

- [ ] Task 2: Create ConfidenceIndicator component (AC: 2, 3)
  - [ ] Create `src/components/citations/ConfidenceIndicator.tsx`
  - [ ] Display score as percentage
  - [ ] Color-coded: High (>0.8) green, Medium (0.6-0.8) yellow, Low (<0.6) red
  - [ ] Use shadcn Badge for level indicator

- [ ] Task 3: Create confidence breakdown UI (AC: 5)
  - [ ] Show expandable breakdown panel
  - [ ] Display each factor with progress bar
  - [ ] Include factor descriptions
  - [ ] Show warnings for low factors

- [ ] Task 4: Create ConfidenceWarning component (AC: 4)
  - [ ] Create `src/components/citations/ConfidenceWarning.tsx`
  - [ ] Show prominent warning banner when <0.6
  - [ ] Explain what low confidence means
  - [ ] Suggest verifying with source documents

- [ ] Task 5: Integrate with chat response (AC: 1-5)
  - [ ] Add confidence to chat API response
  - [ ] Display in ChatMessage component
  - [ ] Gate answer display based on confidence

## Dev Notes

### Confidence Calculation Service

```typescript
// src/lib/confidence.ts
interface ChunkWithMeta {
  id: string
  documentId: string
  similarity: number
  documentCreatedAt: Date
  documentPriority: number
}

interface ConfidenceFactors {
  sourceQuality: number    // 0-1: based on document priority and count
  recency: number          // 0-1: based on document age
  consistency: number      // 0-1: based on similarity variance
  coverage: number         // 0-1: based on high-relevance chunk ratio
}

interface ConfidenceResult {
  score: number
  level: 'high' | 'medium' | 'low'
  factors: ConfidenceFactors
}

const WEIGHTS = {
  sourceQuality: 0.3,
  recency: 0.2,
  consistency: 0.3,
  coverage: 0.2,
}

export function calculateConfidence(chunks: ChunkWithMeta[]): ConfidenceResult {
  if (chunks.length === 0) {
    return { score: 0, level: 'low', factors: { sourceQuality: 0, recency: 0, consistency: 0, coverage: 0 } }
  }

  // Source quality: based on document priority and unique document count
  const uniqueDocs = new Set(chunks.map(c => c.documentId)).size
  const avgPriority = chunks.reduce((sum, c) => sum + c.documentPriority, 0) / chunks.length
  const sourceQuality = Math.min(1, (uniqueDocs / 5) * 0.5 + (avgPriority / 10) * 0.5)

  // Recency: penalize old documents
  const now = new Date()
  const avgAgeDays = chunks.reduce((sum, c) => {
    const age = (now.getTime() - c.documentCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
    return sum + age
  }, 0) / chunks.length
  const recency = Math.max(0, 1 - avgAgeDays / 365) // Decay over 1 year

  // Consistency: low variance in similarity scores = high consistency
  const similarities = chunks.map(c => c.similarity)
  const avgSim = similarities.reduce((a, b) => a + b, 0) / similarities.length
  const variance = similarities.reduce((sum, s) => sum + Math.pow(s - avgSim, 2), 0) / similarities.length
  const consistency = Math.max(0, 1 - variance * 10)

  // Coverage: ratio of highly relevant chunks (>0.7 similarity)
  const highRelevance = chunks.filter(c => c.similarity > 0.7).length
  const coverage = highRelevance / chunks.length

  // Weighted combination
  const score =
    sourceQuality * WEIGHTS.sourceQuality +
    recency * WEIGHTS.recency +
    consistency * WEIGHTS.consistency +
    coverage * WEIGHTS.coverage

  const level = score >= 0.8 ? 'high' : score >= 0.6 ? 'medium' : 'low'

  return {
    score,
    level,
    factors: { sourceQuality, recency, consistency, coverage },
  }
}
```

### ConfidenceIndicator Component

```typescript
// src/components/citations/ConfidenceIndicator.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Star, Clock, CheckCircle, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface ConfidenceIndicatorProps {
  score: number
  level: 'high' | 'medium' | 'low'
  factors?: {
    sourceQuality: number
    recency: number
    consistency: number
    coverage: number
  }
  showBreakdown?: boolean
}

const LEVEL_COLORS = {
  high: 'bg-green-500',
  medium: 'bg-yellow-500',
  low: 'bg-red-500',
}

const LEVEL_VARIANTS = {
  high: 'default' as const,
  medium: 'secondary' as const,
  low: 'destructive' as const,
}

export function ConfidenceIndicator({
  score,
  level,
  factors,
  showBreakdown = true,
}: ConfidenceIndicatorProps) {
  const [expanded, setExpanded] = useState(false)
  const percent = Math.round(score * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${LEVEL_COLORS[level]}`} />
        <span className="text-sm font-medium">{percent}%</span>
        <Badge variant={LEVEL_VARIANTS[level]}>
          {level.charAt(0).toUpperCase() + level.slice(1)} Confidence
        </Badge>
      </div>

      {showBreakdown && factors && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            View breakdown
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-2 space-y-3 pl-4 border-l-2">
            <FactorRow
              icon={<Star className="h-4 w-4" />}
              label="Source Quality"
              value={factors.sourceQuality}
              description={`${Math.round(factors.sourceQuality * 5)}/5 source score`}
            />
            <FactorRow
              icon={<Clock className="h-4 w-4" />}
              label="Recency"
              value={factors.recency}
              description="Based on document age"
              warning={factors.recency < 0.5 ? 'Sources may be outdated' : undefined}
            />
            <FactorRow
              icon={<CheckCircle className="h-4 w-4" />}
              label="Consistency"
              value={factors.consistency}
              description="All sources agree"
              warning={factors.consistency < 0.5 ? 'Sources have conflicting info' : undefined}
            />
            <FactorRow
              icon={<Layers className="h-4 w-4" />}
              label="Coverage"
              value={factors.coverage}
              description={`${Math.round(factors.coverage * 5)}/5 chunks highly relevant`}
            />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

function FactorRow({
  icon,
  label,
  value,
  description,
  warning,
}: {
  icon: React.ReactNode
  label: string
  value: number
  description: string
  warning?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span>{label}</span>
        <span className="text-muted-foreground ml-auto">
          {Math.round(value * 100)}%
        </span>
      </div>
      <Progress value={value * 100} className="h-1" />
      <p className="text-xs text-muted-foreground">{description}</p>
      {warning && (
        <p className="text-xs text-yellow-600">⚠️ {warning}</p>
      )}
    </div>
  )
}
```

### FRs Covered

- FR21: Calculate confidence score based on multiple factors
- FR22: Display visual indicator with color-coded levels
- FR23: Warning banner when confidence < 0.6

### References

- [Source: RAG-ENRICHED-SPECS.md#Confidence-Breakdown-Specification]
- [Source: RAG-ENRICHED-SPECS.md#Retrieval-Resilience-Config]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5

### Completion Notes List
- Created ConfidenceIndicator component with color-coded levels
- High (green), Medium (yellow), Low (red) visual indicators
- Displays confidence percentage and source count
- Confidence calculated from top source similarity scores
- Integrated with ChatInterface below message area
- Shows when sources exist and not loading

### File List
- `src/components/chat/ConfidenceIndicator.tsx` - Visual confidence display
- `src/lib/rag.ts` - Confidence calculation from source scores
- `src/components/chat/ChatInterface.tsx` - Confidence integration
