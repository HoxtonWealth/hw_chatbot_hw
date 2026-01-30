'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useFeedback } from '@/hooks/useFeedback'

interface FeedbackButtonsProps {
  messageId: string
  onSubmit?: (rating: 1 | -1, comment?: string) => void
}

export function FeedbackButtons({ messageId, onSubmit }: FeedbackButtonsProps) {
  const { submitFeedback, hasFeedback, getFeedback, isSubmitting } = useFeedback()
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [comment, setComment] = useState('')

  const submitted = hasFeedback(messageId)
  const feedback = getFeedback(messageId)

  const handleThumbsUp = async () => {
    if (submitted || isSubmitting) return
    await submitFeedback(messageId, 1)
    onSubmit?.(1)
  }

  const handleThumbsDown = () => {
    if (submitted || isSubmitting) return
    setShowCommentDialog(true)
  }

  const handleCommentSubmit = async () => {
    if (isSubmitting) return
    const trimmedComment = comment.trim() || undefined
    await submitFeedback(messageId, -1, trimmedComment)
    setShowCommentDialog(false)
    setComment('')
    onSubmit?.(-1, trimmedComment)
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-muted-foreground">Thanks for your feedback!</span>
        {feedback?.rating === 1 ? (
          <ThumbsUp className="h-3.5 w-3.5 text-primary fill-primary" />
        ) : (
          <ThumbsDown className="h-3.5 w-3.5 text-destructive fill-destructive" />
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-1 mt-1">
        <span className="text-xs text-muted-foreground mr-1">Was this helpful?</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThumbsUp}
          disabled={isSubmitting}
          className="h-7 w-7 p-0"
          aria-label="Thumbs up"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThumbsDown}
          disabled={isSubmitting}
          className="h-7 w-7 p-0"
          aria-label="Thumbs down"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What could be improved?</DialogTitle>
            <DialogDescription>
              Your feedback helps us improve. Leave an optional comment below.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us what went wrong..."
            maxLength={500}
            className="min-h-[100px]"
          />
          <div className="text-xs text-muted-foreground text-right">
            {comment.length}/500
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCommentDialog(false)
                setComment('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCommentSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
