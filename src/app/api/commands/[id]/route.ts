import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('custom_commands')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: { message: 'Command not found' } },
        { status: 404 }
      )
    }

    let updateData: Record<string, unknown>

    if (existing.is_builtin) {
      if (body.description !== undefined) {
        updateData = { description: body.description }
      } else {
        return NextResponse.json(
          { success: false, error: { message: 'Only description can be edited on built-in commands' } },
          { status: 400 }
        )
      }
    } else {
      updateData = {}
      if (body.name !== undefined) {
        const nameRegex = /^[a-z0-9][a-z0-9-]{0,19}$/
        if (!nameRegex.test(body.name)) {
          return NextResponse.json(
            { success: false, error: { message: 'Name must be lowercase alphanumeric + hyphens, max 20 chars, starting with a letter or number' } },
            { status: 400 }
          )
        }
        updateData.name = body.name
      }
      if (body.description !== undefined) updateData.description = body.description
      if (body.usage_hint !== undefined) updateData.usage_hint = body.usage_hint
      if (body.prompt_template !== undefined) updateData.prompt_template = body.prompt_template
    }

    const { data, error } = await supabaseAdmin
      .from('custom_commands')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: { message: 'A command with that name already exists' } },
          { status: 409 }
        )
      }
      console.error('Error updating command:', error)
      return NextResponse.json(
        { success: false, error: { message: 'Failed to update command' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, command: data })
  } catch (error) {
    console.error('Command PUT error:', error)
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('custom_commands')
      .select('is_builtin, name')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: { message: 'Command not found' } },
        { status: 404 }
      )
    }

    if (existing.is_builtin) {
      return NextResponse.json(
        { success: false, error: { message: 'Built-in commands cannot be deleted' } },
        { status: 403 }
      )
    }

    const { error } = await supabaseAdmin
      .from('custom_commands')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting command:', error)
      return NextResponse.json(
        { success: false, error: { message: 'Failed to delete command' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Command DELETE error:', error)
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
