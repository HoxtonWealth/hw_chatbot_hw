import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('custom_commands')
      .select('*')
      .order('is_builtin', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching commands:', error)
      return NextResponse.json(
        { success: false, error: { message: 'Failed to fetch commands' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      commands: data || [],
    })
  } catch (error) {
    console.error('Commands API error:', error)
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, usage_hint, prompt_template } = body

    if (!name || !description) {
      return NextResponse.json(
        { success: false, error: { message: 'Name and description are required' } },
        { status: 400 }
      )
    }

    const nameRegex = /^[a-z0-9][a-z0-9-]{0,19}$/
    if (!nameRegex.test(name)) {
      return NextResponse.json(
        { success: false, error: { message: 'Name must be lowercase alphanumeric + hyphens, max 20 chars, starting with a letter or number' } },
        { status: 400 }
      )
    }

    if (!prompt_template) {
      return NextResponse.json(
        { success: false, error: { message: 'Prompt template is required for custom commands' } },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('custom_commands')
      .insert({
        name,
        description,
        usage_hint: usage_hint || null,
        prompt_template,
        is_builtin: false,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: { message: `A command named "${name}" already exists` } },
          { status: 409 }
        )
      }
      console.error('Error creating command:', error)
      return NextResponse.json(
        { success: false, error: { message: 'Failed to create command' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, command: data }, { status: 201 })
  } catch (error) {
    console.error('Commands POST error:', error)
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
