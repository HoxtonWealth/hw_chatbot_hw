import { NextRequest } from 'next/server'
import { runEvaluation, formatReport } from '@/lib/evaluation/runner'

export const maxDuration = 300 // 5 minute timeout for full evaluation suite

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { testCaseIds, format = 'json' } = body as { testCaseIds?: string[]; format?: 'json' | 'text' }

    const report = await runEvaluation(testCaseIds)

    if (format === 'text') {
      return new Response(formatReport(report), {
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    return new Response(JSON.stringify(report, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Evaluation error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Evaluation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
