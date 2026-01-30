# Story 6.2: Analytics Dashboard

Status: ready-for-dev

## Story

As an **admin**,
I want **to see KB health metrics**,
so that **I can identify content gaps and usage patterns**.

## Acceptance Criteria

1. Dashboard page with metrics cards
2. Total documents, chunks, pending, failed counts
3. Query volume (24h, 7d)
4. Average response time and confidence
5. Top query topics
6. Content gaps (low-confidence queries)
7. Feedback ratio (thumbs up/down)

## Tasks / Subtasks

- [ ] Task 1: Create dashboard page (AC: 1)
  - [ ] Create `src/app/dashboard/page.tsx`
  - [ ] Layout with grid of metric cards
  - [ ] Responsive design for mobile
  - [ ] Use shadcn Card and Tabs

- [ ] Task 2: Create analytics API (AC: 2-7)
  - [ ] Create `src/app/api/analytics/route.ts`
  - [ ] Query document statistics
  - [ ] Query usage metrics from query_logs
  - [ ] Query feedback statistics
  - [ ] Aggregate top topics and gaps

- [ ] Task 3: Create MetricCard component (AC: 2, 3, 4)
  - [ ] Create `src/components/dashboard/MetricCard.tsx`
  - [ ] Display title, value, trend indicator
  - [ ] Support different value formats (number, percent, time)
  - [ ] Loading skeleton state

- [ ] Task 4: Create overview metrics (AC: 2)
  - [ ] Total documents card
  - [ ] Total chunks card
  - [ ] Pending documents card
  - [ ] Failed documents card
  - [ ] Stale documents (90+ days) card

- [ ] Task 5: Create usage metrics (AC: 3, 4)
  - [ ] Queries last 24h card
  - [ ] Queries last 7d card
  - [ ] Average response time card
  - [ ] Average confidence score card

- [ ] Task 6: Create TopicsChart component (AC: 5)
  - [ ] Create `src/components/dashboard/TopicsChart.tsx`
  - [ ] Display top query topics
  - [ ] Bar chart or list format
  - [ ] Show query count per topic

- [ ] Task 7: Create GapsList component (AC: 6)
  - [ ] Create `src/components/dashboard/GapsList.tsx`
  - [ ] Show low-confidence queries
  - [ ] Display query text and avg confidence
  - [ ] Suggest content additions

- [ ] Task 8: Create FeedbackStats component (AC: 7)
  - [ ] Create `src/components/dashboard/FeedbackStats.tsx`
  - [ ] Show thumbs up/down counts
  - [ ] Calculate and display ratio
  - [ ] Trend indicator

## Dev Notes

### Dashboard Page

```typescript
// src/app/dashboard/page.tsx
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { TopicsChart } from '@/components/dashboard/TopicsChart'
import { GapsList } from '@/components/dashboard/GapsList'
import { FeedbackStats } from '@/components/dashboard/FeedbackStats'
import { getAnalytics } from '@/lib/analytics'

export default async function DashboardPage() {
  const analytics = await getAnalytics()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Knowledge Base Dashboard</h1>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Documents"
          value={analytics.overview.totalDocuments}
          icon="file"
        />
        <MetricCard
          title="Total Chunks"
          value={analytics.overview.totalChunks}
          icon="layers"
        />
        <MetricCard
          title="Pending"
          value={analytics.overview.pendingDocuments}
          icon="clock"
          variant={analytics.overview.pendingDocuments > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          title="Failed"
          value={analytics.overview.failedDocuments}
          icon="alert"
          variant={analytics.overview.failedDocuments > 0 ? 'destructive' : 'default'}
        />
      </div>

      {/* Usage Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Queries (24h)"
          value={analytics.usage.queriesLast24h}
          icon="search"
        />
        <MetricCard
          title="Queries (7d)"
          value={analytics.usage.queriesLast7d}
          icon="calendar"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${analytics.usage.avgResponseTimeMs}ms`}
          icon="timer"
        />
        <MetricCard
          title="Avg Confidence"
          value={`${Math.round(analytics.usage.avgConfidenceScore * 100)}%`}
          icon="target"
        />
      </div>

      {/* Detailed Sections */}
      <Tabs defaultValue="topics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="topics">Top Topics</TabsTrigger>
          <TabsTrigger value="gaps">Content Gaps</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="topics">
          <TopicsChart topics={analytics.topTopics} />
        </TabsContent>

        <TabsContent value="gaps">
          <GapsList gaps={analytics.gaps} />
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbackStats feedback={analytics.feedback} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### Analytics API

```typescript
// src/app/api/analytics/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Document overview
  const { data: docStats } = await supabase
    .from('documents')
    .select('status, created_at')

  const overview = {
    totalDocuments: docStats?.length || 0,
    pendingDocuments: docStats?.filter(d => d.status === 'pending').length || 0,
    failedDocuments: docStats?.filter(d => d.status === 'failed').length || 0,
    staleDocuments: docStats?.filter(d => new Date(d.created_at) < ninetyDaysAgo).length || 0,
  }

  // Chunk count
  const { count: totalChunks } = await supabase
    .from('document_chunks')
    .select('*', { count: 'exact', head: true })

  overview.totalChunks = totalChunks || 0

  // Usage stats
  const { data: recentQueries } = await supabase
    .from('query_logs')
    .select('created_at, total_latency_ms')
    .gte('created_at', sevenDaysAgo.toISOString())

  const queriesLast24h = recentQueries?.filter(
    q => new Date(q.created_at) > oneDayAgo
  ).length || 0

  const avgResponseTimeMs = recentQueries?.length
    ? Math.round(
        recentQueries.reduce((sum, q) => sum + (q.total_latency_ms || 0), 0) /
        recentQueries.length
      )
    : 0

  // Confidence stats
  const { data: messages } = await supabase
    .from('messages')
    .select('confidence_score')
    .not('confidence_score', 'is', null)
    .gte('created_at', sevenDaysAgo.toISOString())

  const avgConfidenceScore = messages?.length
    ? messages.reduce((sum, m) => sum + m.confidence_score, 0) / messages.length
    : 0

  // Top topics (would need NLP or manual tagging in production)
  const topTopics = [
    { topic: 'Pricing', queryCount: 45 },
    { topic: 'Integration', queryCount: 38 },
    { topic: 'API', queryCount: 32 },
    // ... aggregated from query analysis
  ]

  // Content gaps
  const { data: lowConfidenceQueries } = await supabase
    .from('query_logs')
    .select('query_text')
    .lte('similarity_scores', 0.5)
    .limit(10)

  // Feedback
  const { data: feedbackData } = await supabase
    .from('feedback')
    .select('rating')

  const feedback = {
    positive: feedbackData?.filter(f => f.rating === 1).length || 0,
    negative: feedbackData?.filter(f => f.rating === -1).length || 0,
    ratio: 0,
  }
  feedback.ratio = feedback.positive + feedback.negative > 0
    ? feedback.positive / (feedback.positive + feedback.negative)
    : 0

  return NextResponse.json({
    overview,
    usage: {
      queriesLast24h,
      queriesLast7d: recentQueries?.length || 0,
      avgResponseTimeMs,
      avgConfidenceScore,
    },
    topTopics,
    gaps: lowConfidenceQueries || [],
    feedback,
  })
}
```

### MetricCard Component

```typescript
// src/components/dashboard/MetricCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FileText, Layers, Clock, AlertCircle, Search, Calendar, Timer, Target } from 'lucide-react'

const ICONS = {
  file: FileText,
  layers: Layers,
  clock: Clock,
  alert: AlertCircle,
  search: Search,
  calendar: Calendar,
  timer: Timer,
  target: Target,
}

interface MetricCardProps {
  title: string
  value: string | number
  icon: keyof typeof ICONS
  variant?: 'default' | 'warning' | 'destructive'
}

export function MetricCard({ title, value, icon, variant = 'default' }: MetricCardProps) {
  const Icon = ICONS[icon]

  return (
    <Card className={cn(
      variant === 'warning' && 'border-yellow-500',
      variant === 'destructive' && 'border-red-500'
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
```

### FRs Covered

- FR32: Dashboard with document and chunk statistics
- FR33: Query volume and feedback metrics
- FR34: Average response time and confidence display
- FR35: Top topics and content gaps identification

### References

- [Source: RAG-ENRICHED-SPECS.md#GET-api-analytics]
- [Source: RAG-ENRICHED-SPECS.md#Analytics-Response]

## Dev Agent Record

### Agent Model Used
_To be filled by dev agent_

### Completion Notes List
_To be filled by dev agent_

### File List
_To be filled by dev agent_
