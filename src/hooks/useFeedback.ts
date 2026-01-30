'use client'

import { useState, useCallback } from 'react'

interface FeedbackEntry {
  rating: 1 | -1
  comment?: string
}

interface UseFeedbackReturn {
  submitFeedback: (messageId: string, rating: 1 | -1, comment?: string) => Promise<void>
  hasFeedback: (messageId: string) => boolean
  getFeedback: (messageId: string) => FeedbackEntry | undefined
  isSubmitting: boolean
}

export function useFeedback(): UseFeedbackReturn {
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackEntry>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitFeedback = useCallback(async (
    messageId: string,
    rating: 1 | -1,
    comment?: string
  ) => {
    // Prevent duplicate submissions
    if (feedbackMap[messageId]) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, rating, comment }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      setFeedbackMap(prev => ({
        ...prev,
        [messageId]: { rating, comment },
      }))
    } finally {
      setIsSubmitting(false)
    }
  }, [feedbackMap])

  const hasFeedback = useCallback((messageId: string): boolean => {
    return messageId in feedbackMap
  }, [feedbackMap])

  const getFeedback = useCallback((messageId: string): FeedbackEntry | undefined => {
    return feedbackMap[messageId]
  }, [feedbackMap])

  return { submitFeedback, hasFeedback, getFeedback, isSubmitting }
}
