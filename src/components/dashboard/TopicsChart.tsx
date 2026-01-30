'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TopicEntry {
  topic: string
  queryCount: number
}

interface TopicsChartProps {
  topics: TopicEntry[]
  loading?: boolean
}

export function TopicsChart({ topics, loading }: TopicsChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Query Topics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-8 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxCount = topics.length > 0 ? Math.max(...topics.map(t => t.queryCount)) : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Query Topics</CardTitle>
      </CardHeader>
      <CardContent>
        {topics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No queries recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {topics.map((topic, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate max-w-[80%]">{topic.topic}</span>
                  <span className="text-muted-foreground font-medium">{topic.queryCount}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(topic.queryCount / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
