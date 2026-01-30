'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface FeedbackData {
  positive: number
  negative: number
  total: number
  ratio: number
}

interface FeedbackStatsProps {
  feedback: FeedbackData
  loading?: boolean
}

export function FeedbackStats({ feedback, loading }: FeedbackStatsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  const ratioPercent = Math.round(feedback.ratio * 100)

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Feedback</CardTitle>
      </CardHeader>
      <CardContent>
        {feedback.total === 0 ? (
          <p className="text-sm text-muted-foreground">No feedback received yet.</p>
        ) : (
          <div className="space-y-6">
            {/* Ratio bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Satisfaction Ratio</span>
                <span className="font-medium">{ratioPercent}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${ratioPercent}%` }}
                />
                <div
                  className="h-full bg-red-400 transition-all"
                  style={{ width: `${100 - ratioPercent}%` }}
                />
              </div>
            </div>

            {/* Counts */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1 text-green-600">
                  <ThumbsUp className="h-4 w-4" />
                  <span className="text-2xl font-bold">{feedback.positive}</span>
                </div>
                <p className="text-xs text-muted-foreground">Positive</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1 text-red-500">
                  <ThumbsDown className="h-4 w-4" />
                  <span className="text-2xl font-bold">{feedback.negative}</span>
                </div>
                <p className="text-xs text-muted-foreground">Negative</p>
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-bold text-muted-foreground">{feedback.total}</span>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
