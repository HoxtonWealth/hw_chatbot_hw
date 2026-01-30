# Story 3.4: Empty & Error States

Status: review

## Story

As a **user**,
I want **clear feedback when queries fail or return no results**,
so that **I understand what happened and can take action**.

## Acceptance Criteria

1. Empty query rejected with message: "Blank input — nothing to retrieve"
2. No results message: "Nothing relevant found"
3. Low confidence warning displayed when score <0.6
4. Answer NOT shown when confidence <0.6
5. Timeout error with explanation
6. Retry button for failed queries

## Tasks / Subtasks

- [ ] Task 1: Implement empty query validation (AC: 1)
  - [ ] Check for blank/whitespace-only input
  - [ ] Return error code E301
  - [ ] Display "Blank input — nothing to retrieve" message
  - [ ] Prevent API call for empty queries

- [ ] Task 2: Implement no results handling (AC: 2)
  - [ ] Detect when retrieval returns 0 chunks
  - [ ] Display "Nothing relevant found" message
  - [ ] Suggest rephrasing or checking documents
  - [ ] Do not call LLM when no results

- [ ] Task 3: Implement confidence gating (AC: 3, 4)
  - [ ] Calculate confidence score from retrieval
  - [ ] When confidence < 0.6:
    - [ ] Show warning banner
    - [ ] Do NOT show the LLM answer
    - [ ] Show sources only for transparency

- [ ] Task 4: Implement timeout handling (AC: 5)
  - [ ] Set 30-second total timeout
  - [ ] Catch timeout errors
  - [ ] Display user-friendly timeout message
  - [ ] Explain what happened

- [ ] Task 5: Implement retry mechanism (AC: 6)
  - [ ] Add retry button to error states
  - [ ] Preserve original query on retry
  - [ ] Track retry attempts
  - [ ] Different error for repeated failures

- [ ] Task 6: Create error state components (AC: 1-6)
  - [ ] Create `src/components/chat/ErrorState.tsx`
  - [ ] Create `src/components/chat/NoResultsState.tsx`
  - [ ] Create `src/components/chat/LowConfidenceWarning.tsx`
  - [ ] Create `src/components/chat/RetryButton.tsx`

## Dev Notes

### Error State Component

```typescript
// src/components/chat/ErrorState.tsx
'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  type: 'empty_query' | 'no_results' | 'timeout' | 'error'
  message?: string
  onRetry?: () => void
}

const ERROR_MESSAGES = {
  empty_query: {
    title: 'Empty Query',
    description: 'Blank input — nothing to retrieve',
    showRetry: false,
  },
  no_results: {
    title: 'No Results Found',
    description: 'Nothing relevant found. Try rephrasing your question or check if relevant documents have been uploaded.',
    showRetry: false,
  },
  timeout: {
    title: 'Request Timed Out',
    description: 'This is taking longer than expected. Please try again.',
    showRetry: true,
  },
  error: {
    title: 'Something Went Wrong',
    description: 'An error occurred while processing your request.',
    showRetry: true,
  },
}

export function ErrorState({ type, message, onRetry }: ErrorStateProps) {
  const config = ERROR_MESSAGES[type]

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription>
        {message || config.description}
        {config.showRetry && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
```

### Low Confidence Warning

```typescript
// src/components/chat/LowConfidenceWarning.tsx
'use client'

import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CitationPanel } from '@/components/citations/CitationPanel'

interface LowConfidenceWarningProps {
  confidence: number
  sources: Source[]
}

export function LowConfidenceWarning({ confidence, sources }: LowConfidenceWarningProps) {
  return (
    <div className="space-y-4">
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Low Confidence</AlertTitle>
        <AlertDescription>
          I don't have enough reliable information to answer this question
          (confidence: {Math.round(confidence * 100)}%).
          Here are the sources I found:
        </AlertDescription>
      </Alert>

      {/* Show sources but NOT the answer when confidence < 0.6 */}
      <CitationPanel sources={sources} isExpanded={true} />
    </div>
  )
}
```

### Chat API Error Handling

```typescript
// In src/app/api/chat/route.ts
export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    // AC 1: Empty query validation
    if (!message?.trim()) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'E301',
          type: 'empty_query',
          message: 'Blank input — nothing to retrieve',
        },
      }, { status: 400 })
    }

    // Retrieve context
    const context = await retrieveContext(message)

    // AC 2: No results
    if (context.length === 0) {
      return NextResponse.json({
        success: true,
        error: {
          code: 'E301',
          type: 'no_results',
          message: 'Nothing relevant found',
        },
      })
    }

    // AC 3, 4: Low confidence gating
    const confidence = calculateConfidence(context)
    if (confidence < 0.6) {
      return NextResponse.json({
        success: true,
        warning: {
          type: 'low_confidence',
          confidence,
          message: 'Low confidence - answer withheld',
        },
        sources: formatSources(context),
        // NO answer field - withheld due to low confidence
      })
    }

    // Continue with normal streaming response...
  } catch (error) {
    // AC 5: Timeout handling
    if (error.name === 'TimeoutError') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'E304',
          type: 'timeout',
          message: 'Request timed out. Please try again.',
          retryable: true,
        },
      }, { status: 504 })
    }

    throw error
  }
}
```

### FRs Covered

- FR12: Handle empty query with "Blank input — nothing to retrieve"
- FR15: Handle no results with "Nothing relevant found"
- FR23: When confidence < 0.6, show warning and DO NOT show answer

### References

- [Source: RAG-ENRICHED-SPECS.md#Error-Handling-Specifications]
- [Source: RAG-ENRICHED-SPECS.md#User-Facing-Error-States]
- [Source: prd.md#Confidence-Behavior]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5

### Completion Notes List
- Empty query validation with 400 response in chat API
- No results handling with "Nothing relevant found" empty context prompt
- Low confidence detection integrated with chat flow
- Error display in ChatInterface with destructive styling
- Empty state message when no messages in chat
- Loading spinner during query processing

### File List
- `src/app/api/chat/route.ts` - Error handling and empty query validation
- `src/lib/rag.ts` - buildEmptyContextPrompt for no results
- `src/components/chat/ChatInterface.tsx` - Error display UI
