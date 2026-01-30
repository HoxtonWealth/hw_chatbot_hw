import { NextRequest, NextResponse } from 'next/server'
import { hybridSearch } from '@/lib/retrieval/hybrid'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, documentIds, limit = 20, threshold = 0.5 } = body

    if (!query?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'E301', message: 'Query is required' } },
        { status: 400 }
      )
    }

    const results = await hybridSearch({
      query: query.trim(),
      documentIds,
      limit,
      threshold,
    })

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'E300',
          message: error instanceof Error ? error.message : 'Search failed'
        }
      },
      { status: 500 }
    )
  }
}
