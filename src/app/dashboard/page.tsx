'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { TopicsChart } from '@/components/dashboard/TopicsChart'
import { GapsList } from '@/components/dashboard/GapsList'
import { FeedbackStats } from '@/components/dashboard/FeedbackStats'
import { RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface AnalyticsData {
  overview: {
    totalDocuments: number
    totalChunks: number
    pendingDocuments: number
    failedDocuments: number
    staleDocuments: number
  }
  usage: {
    queriesLast24h: number
    queriesLast7d: number
    avgResponseTimeMs: number
    avgConfidenceScore: number
  }
  topTopics: Array<{ topic: string; queryCount: number }>
  gaps: Array<{ queryText: string; confidence: number; date: string }>
  feedback: { positive: number; negative: number; total: number; ratio: number }
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analytics')
      if (!res.ok) throw new Error('Failed to fetch analytics')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Unknown error')
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const overview = data?.overview
  const usage = data?.usage

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">GTM Knowledge Base</h1>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/">Upload</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/documents">Documents</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/chat">Chat</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="text-destructive text-sm border border-destructive/50 rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Documents"
            value={overview?.totalDocuments ?? 0}
            icon="file"
            loading={loading}
          />
          <MetricCard
            title="Total Chunks"
            value={overview?.totalChunks ?? 0}
            icon="layers"
            loading={loading}
          />
          <MetricCard
            title="Pending"
            value={overview?.pendingDocuments ?? 0}
            icon="clock"
            variant={(overview?.pendingDocuments ?? 0) > 0 ? 'warning' : 'default'}
            loading={loading}
          />
          <MetricCard
            title="Failed"
            value={overview?.failedDocuments ?? 0}
            icon="alert"
            variant={(overview?.failedDocuments ?? 0) > 0 ? 'destructive' : 'default'}
            loading={loading}
          />
        </div>

        {/* Usage Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Queries (24h)"
            value={usage?.queriesLast24h ?? 0}
            icon="search"
            loading={loading}
          />
          <MetricCard
            title="Queries (7d)"
            value={usage?.queriesLast7d ?? 0}
            icon="calendar"
            loading={loading}
          />
          <MetricCard
            title="Avg Response Time"
            value={usage ? `${usage.avgResponseTimeMs}ms` : '—'}
            icon="timer"
            loading={loading}
          />
          <MetricCard
            title="Avg Confidence"
            value={usage ? `${Math.round(usage.avgConfidenceScore * 100)}%` : '—'}
            icon="target"
            loading={loading}
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
            <TopicsChart topics={data?.topTopics || []} loading={loading} />
          </TabsContent>

          <TabsContent value="gaps">
            <GapsList gaps={data?.gaps || []} loading={loading} />
          </TabsContent>

          <TabsContent value="feedback">
            <FeedbackStats
              feedback={data?.feedback || { positive: 0, negative: 0, total: 0, ratio: 0 }}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
