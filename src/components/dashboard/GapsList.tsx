'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface GapEntry {
  queryText: string
  confidence: number
  date: string
}

interface GapsListProps {
  gaps: GapEntry[]
  loading?: boolean
}

export function GapsList({ gaps, loading }: GapsListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Gaps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          Content Gaps
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Queries with low confidence scores — consider adding related content.
        </p>
      </CardHeader>
      <CardContent>
        {gaps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No content gaps identified yet.</p>
        ) : (
          <div className="space-y-3">
            {gaps.map((gap, index) => (
              <div key={index} className="flex items-start justify-between border rounded-lg p-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="text-sm truncate">{gap.queryText}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(gap.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                    {Math.round(gap.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
