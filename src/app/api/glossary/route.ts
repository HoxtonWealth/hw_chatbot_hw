import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    let query = supabaseAdmin
      .from('glossary')
      .select('*, documents:source_document_id(title)')
      .order('term', { ascending: true })

    if (search) {
      query = query.ilike('term', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: 'Failed to fetch glossary terms' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      terms: data,
      count: data.length,
    })
  } catch (error) {
    console.error('Glossary API error:', error)
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
