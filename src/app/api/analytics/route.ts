import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Document overview
    const { data: docStats } = await supabaseAdmin
      .from('documents')
      .select('status, created_at')

    const overview = {
      totalDocuments: docStats?.length || 0,
      totalChunks: 0,
      pendingDocuments: docStats?.filter(d => d.status === 'pending' || d.status === 'processing').length || 0,
      failedDocuments: docStats?.filter(d => d.status === 'failed').length || 0,
      staleDocuments: docStats?.filter(d => new Date(d.created_at) < ninetyDaysAgo).length || 0,
    }

    // Chunk count
    const { count: totalChunks } = await supabaseAdmin
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('level', 'chunk')

    overview.totalChunks = totalChunks || 0

    // Usage stats from query_logs
    const { data: recentQueries } = await supabaseAdmin
      .from('query_logs')
      .select('query_text, created_at, total_latency_ms')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    const queriesLast24h = recentQueries?.filter(
      q => new Date(q.created_at) > oneDayAgo
    ).length || 0

    const avgResponseTimeMs = recentQueries?.length
      ? Math.round(
          recentQueries.reduce((sum, q) => sum + (q.total_latency_ms || 0), 0) /
          recentQueries.length
        )
      : 0

    // Confidence stats from messages
    const { data: recentMessages } = await supabaseAdmin
      .from('messages')
      .select('confidence_score')
      .not('confidence_score', 'is', null)
      .gte('created_at', sevenDaysAgo.toISOString())

    const avgConfidenceScore = recentMessages?.length
      ? recentMessages.reduce((sum, m) => sum + (m.confidence_score || 0), 0) / recentMessages.length
      : 0

    // Top queries (recent unique queries — real topic extraction would need NLP)
    const queryFrequency: Record<string, number> = {}
    if (recentQueries) {
      for (const q of recentQueries) {
        const text = q.query_text?.toLowerCase().trim()
        if (text) {
          queryFrequency[text] = (queryFrequency[text] || 0) + 1
        }
      }
    }
    const topTopics = Object.entries(queryFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, queryCount]) => ({ topic, queryCount }))

    // Content gaps — messages with low confidence
    const { data: lowConfidenceMessages } = await supabaseAdmin
      .from('messages')
      .select('content, confidence_score, created_at')
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(50)

    // Match with their assistant responses to get confidence
    const { data: assistantMessages } = await supabaseAdmin
      .from('messages')
      .select('content, confidence_score, conversation_id, created_at')
      .eq('role', 'assistant')
      .not('confidence_score', 'is', null)
      .lt('confidence_score', 0.5)
      .order('created_at', { ascending: false })
      .limit(10)

    const gaps = (assistantMessages || []).map(m => ({
      queryText: m.content?.slice(0, 100) || 'Unknown query',
      confidence: m.confidence_score || 0,
      date: m.created_at,
    }))

    // Feedback stats
    const { data: feedbackData } = await supabaseAdmin
      .from('feedback')
      .select('rating, created_at')

    const positive = feedbackData?.filter(f => f.rating === 1).length || 0
    const negative = feedbackData?.filter(f => f.rating === -1).length || 0
    const total = positive + negative
    const feedback = {
      positive,
      negative,
      total,
      ratio: total > 0 ? positive / total : 0,
    }

    return NextResponse.json({
      success: true,
      overview,
      usage: {
        queriesLast24h,
        queriesLast7d: recentQueries?.length || 0,
        avgResponseTimeMs,
        avgConfidenceScore,
      },
      topTopics,
      gaps,
      feedback,
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
