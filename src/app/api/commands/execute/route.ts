import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { command, args } = body

    if (!command) {
      return NextResponse.json(
        { success: false, error: { message: 'Command name is required' } },
        { status: 400 }
      )
    }

    // Fetch the command from the database
    const { data: cmd, error: fetchError } = await supabaseAdmin
      .from('custom_commands')
      .select('*')
      .eq('name', command)
      .single()

    if (fetchError || !cmd) {
      return NextResponse.json(
        { success: false, error: { message: `Unknown command: /${command}` } },
        { status: 404 }
      )
    }

    if (!cmd.prompt_template) {
      return NextResponse.json(
        { success: false, error: { message: `Command /${command} has no prompt template configured.` } },
        { status: 400 }
      )
    }

    const query = Array.isArray(args) ? args.join(' ') : ''

    // Replace template variables
    let prompt = cmd.prompt_template
    prompt = prompt.replace(/\{\{query\}\}/g, query)
    prompt = prompt.replace(/\{\{context\}\}/g, 'No context retrieved yet.')
    prompt = prompt.replace(/\{\{sources\}\}/g, 'No sources available.')

    return NextResponse.json({
      success: true,
      content: `**/${command}**: ${cmd.description}\n\n_Prompt prepared:_\n${prompt}\n\n_Custom command execution is ready. Connect to the LLM pipeline for full execution._`,
    })
  } catch (error) {
    console.error('Command execute error:', error)
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
