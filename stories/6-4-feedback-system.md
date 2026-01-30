# Story 6.4: Feedback System

Status: review

## Story

As a **user**,
I want **to rate answers with thumbs up/down**,
so that **the system can track answer quality**.

## Acceptance Criteria

1. Thumbs up/down buttons on each answer
2. Feedback stored in database
3. Optional comment field
4. Feedback reflected in analytics

## Tasks / Subtasks

- [x] Task 1: Create FeedbackButtons component (AC: 1)
  - [x] Create `src/components/chat/FeedbackButtons.tsx`
  - [x] Thumbs up and thumbs down buttons
  - [x] Visual state for selected feedback (fill color change)
  - [x] Disable after submission with "Thanks for your feedback!" message

- [x] Task 2: Create feedback API (AC: 2)
  - [x] Create `src/app/api/feedback/route.ts`
  - [x] POST: Submit feedback with rating (1 or -1)
  - [x] Link to message_id (with UUID validation)
  - [x] Store optional comment (max 500 chars)

- [x] Task 3: Implement optional comment (AC: 3)
  - [x] Show comment dialog after thumbs down
  - [x] Thumbs up submits immediately
  - [x] Use shadcn Dialog with Textarea
  - [x] 500 character limit with counter

- [x] Task 4: Integrate with ChatMessage (AC: 1)
  - [x] Add FeedbackButtons to latest assistant message
  - [x] Pass message ID for submission
  - [x] Show "Thanks for your feedback!" confirmation

- [x] Task 5: Update analytics (AC: 4)
  - [x] Feedback stats included in analytics API
  - [x] Calculate positive/negative/total/ratio
  - [x] FeedbackStats component in dashboard

- [x] Task 6: Create useFeedback hook (AC: 1, 2)
  - [x] Create `src/hooks/useFeedback.ts`
  - [x] Handle submission state with isSubmitting
  - [x] Track submitted feedback locally in feedbackMap
  - [x] Prevent duplicate submissions per message

## Dev Notes

### FeedbackButtons Component

```typescript
// src/components/common/FeedbackButtons.tsx
'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface FeedbackButtonsProps {
  messageId: string
  onSubmit?: (rating: 1 | -1, comment?: string) => void
}

export function FeedbackButtons({ messageId, onSubmit }: FeedbackButtonsProps) {
  const [submitted, setSubmitted] = useState<1 | -1 | null>(null)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFeedback = async (rating: 1 | -1) => {
    if (rating === -1) {
      // Show comment dialog for negative feedback
      setShowCommentDialog(true)
      return
    }

    await submitFeedback(rating)
  }

  const submitFeedback = async (rating: 1 | -1, feedbackComment?: string) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          rating,
          comment: feedbackComment,
        }),
      })

      if (response.ok) {
        setSubmitted(rating)
        setShowCommentDialog(false)
        onSubmit?.(rating, feedbackComment)
      }
    } catch (error) {
      console.error('Feedback submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted !== null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Thanks for your feedback!</span>
        {submitted === 1 ? (
          <ThumbsUp className="h-4 w-4 text-green-500 fill-green-500" />
        ) : (
          <ThumbsDown className="h-4 w-4 text-red-500 fill-red-500" />
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-2">Was this helpful?</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFeedback(1)}
          className="h-8 w-8 p-0"
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFeedback(-1)}
          className="h-8 w-8 p-0"
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help us improve</DialogTitle>
            <DialogDescription>
              What could have been better about this answer? (Optional)
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us what went wrong..."
            maxLength={500}
            rows={3}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCommentDialog(false)
                submitFeedback(-1)
              }}
            >
              Skip
            </Button>
            <Button
              onClick={() => submitFeedback(-1, comment)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

### Feedback API

```typescript
// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { messageId, rating, comment } = await request.json()

  // Validate rating
  if (rating !== 1 && rating !== -1) {
    return NextResponse.json(
      { success: false, error: { message: 'Rating must be 1 or -1' } },
      { status: 400 }
    )
  }

  // Check message exists
  const { data: message } = await supabase
    .from('messages')
    .select('id')
    .eq('id', messageId)
    .single()

  if (!message) {
    return NextResponse.json(
      { success: false, error: { message: 'Message not found' } },
      { status: 404 }
    )
  }

  // Insert feedback
  const { data, error } = await supabase
    .from('feedback')
    .insert({
      message_id: messageId,
      rating,
      comment: comment || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    feedback: data,
  })
}
```

### useFeedback Hook

```typescript
// src/hooks/useFeedback.ts
'use client'

import { useState, useCallback } from 'react'

interface FeedbackState {
  [messageId: string]: 1 | -1
}

export function useFeedback() {
  const [submittedFeedback, setSubmittedFeedback] = useState<FeedbackState>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitFeedback = useCallback(async (
    messageId: string,
    rating: 1 | -1,
    comment?: string
  ) => {
    // Prevent duplicate submissions
    if (submittedFeedback[messageId]) return false

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, rating, comment }),
      })

      if (response.ok) {
        setSubmittedFeedback(prev => ({
          ...prev,
          [messageId]: rating,
        }))
        return true
      }
      return false
    } catch {
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [submittedFeedback])

  const hasFeedback = useCallback((messageId: string) => {
    return messageId in submittedFeedback
  }, [submittedFeedback])

  const getFeedback = useCallback((messageId: string) => {
    return submittedFeedback[messageId]
  }, [submittedFeedback])

  return {
    submitFeedback,
    hasFeedback,
    getFeedback,
    isSubmitting,
  }
}
```

### Integration with ChatMessage

```typescript
// In ChatMessage component
import { FeedbackButtons } from '@/components/common/FeedbackButtons'

// Add to assistant messages:
{!isUser && messageId && (
  <div className="mt-2">
    <FeedbackButtons messageId={messageId} />
  </div>
)}
```

### FRs Covered

- FR33: Thumbs up/down feedback on answers, stored for analytics

### References

- [Source: RAG-ENRICHED-SPECS.md#Feedback-Table]
- [Source: RAG-ENRICHED-SPECS.md#Analytics-Response]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List
- All 6 tasks completed and verified
- FeedbackButtons shows on latest assistant message only
- Thumbs up submits immediately; thumbs down opens comment dialog
- useFeedback hook tracks per-message feedback state client-side
- Feedback API validates rating, comment length, and UUID format
- Analytics API includes feedback stats (positive, negative, total, ratio)
- Dashboard FeedbackStats component shows satisfaction ratio bar
- TypeScript check and Next.js build pass clean

### File List
**Files:**
- `src/components/chat/FeedbackButtons.tsx` — Thumbs up/down UI with comment dialog
- `src/hooks/useFeedback.ts` — Feedback state management hook
- `src/app/api/feedback/route.ts` — Feedback submission API
- `src/components/chat/ChatMessage.tsx` — Integration point (renders FeedbackButtons)
- `src/components/dashboard/FeedbackStats.tsx` — Dashboard feedback visualization
- `src/app/api/analytics/route.ts` — Includes feedback aggregation
