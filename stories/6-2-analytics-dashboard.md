# Story 6.2: Analytics Dashboard

Status: review

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

- [x] Task 1: Create dashboard page (AC: 1)
  - [x] Create `src/app/dashboard/page.tsx`
  - [x] Layout with grid of metric cards
  - [x] Responsive design (grid-cols-2 → lg:grid-cols-4)
  - [x] Use shadcn Card and Tabs

- [x] Task 2: Create analytics API (AC: 2-7)
  - [x] Create `src/app/api/analytics/route.ts`
  - [x] Query document statistics
  - [x] Query usage metrics from query_logs
  - [x] Query feedback statistics
  - [x] Aggregate top topics and content gaps

- [x] Task 3: Create MetricCard component (AC: 2, 3, 4)
  - [x] Create `src/components/dashboard/MetricCard.tsx`
  - [x] Display title, value, icon
  - [x] Support different value formats (number, percent, time)
  - [x] Loading skeleton state

- [x] Task 4: Create overview metrics (AC: 2)
  - [x] Total documents card
  - [x] Total chunks card
  - [x] Pending documents card (warning variant)
  - [x] Failed documents card (destructive variant)

- [x] Task 5: Create usage metrics (AC: 3, 4)
  - [x] Queries last 24h card
  - [x] Queries last 7d card
  - [x] Average response time card
  - [x] Average confidence score card

- [x] Task 6: Create TopicsChart component (AC: 5)
  - [x] Create `src/components/dashboard/TopicsChart.tsx`
  - [x] Display top query topics
  - [x] Horizontal bar chart format
  - [x] Show query count per topic

- [x] Task 7: Create GapsList component (AC: 6)
  - [x] Create `src/components/dashboard/GapsList.tsx`
  - [x] Show low-confidence queries
  - [x] Display query text and confidence percentage
  - [x] Guidance text for content additions

- [x] Task 8: Create FeedbackStats component (AC: 7)
  - [x] Create `src/components/dashboard/FeedbackStats.tsx`
  - [x] Show thumbs up/down counts
  - [x] Calculate and display satisfaction ratio
  - [x] Visual ratio bar (green/red)

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
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List
- All 8 tasks completed and verified
- Dashboard is a client component with fetch-on-mount and refresh button
- Analytics API aggregates from documents, document_chunks, query_logs, messages, and feedback tables
- Top topics extracted from query frequency (real queries, not mock data)
- Content gaps identified from low-confidence assistant messages
- All components have loading skeleton states
- TypeScript check and Next.js build pass clean

### File List
**Files:**
- `src/app/dashboard/page.tsx` — Dashboard page with tabs and metric grid
- `src/app/api/analytics/route.ts` — Analytics data aggregation API
- `src/components/dashboard/MetricCard.tsx` — Reusable metric card component
- `src/components/dashboard/TopicsChart.tsx` — Top query topics bar chart
- `src/components/dashboard/GapsList.tsx` — Content gaps list
- `src/components/dashboard/FeedbackStats.tsx` — Feedback ratio visualization
