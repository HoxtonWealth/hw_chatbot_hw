import { supabaseAdmin, CustomCommand } from '@/lib/supabase'
import { CommandResult, CommandContext } from './index'

/**
 * Fetches a custom command by name from the database.
 */
export async function getCustomCommand(name: string): Promise<CustomCommand | null> {
  const { data, error } = await supabaseAdmin
    .from('custom_commands')
    .select('*')
    .eq('name', name)
    .single()

  if (error || !data) return null
  return data as CustomCommand
}

/**
 * Checks whether a given command name exists as a custom command.
 */
export async function isCustomCommand(name: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('custom_commands')
    .select('id', { count: 'exact', head: true })
    .eq('name', name)

  if (error) return false
  return (count ?? 0) > 0
}

/**
 * Fetches all custom command names for validation.
 */
export async function getAllCommandNames(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('custom_commands')
    .select('name')

  if (error || !data) return []
  return data.map((c) => c.name)
}

/**
 * Executes a custom command by:
 * 1. Fetching the prompt template from the database
 * 2. Replacing {{query}} with user args
 * 3. Replacing {{context}} with retrieved document chunks
 * 4. Sending to the LLM via the chat API
 */
export async function executeCustomCommand(
  name: string,
  args: string[],
  context: CommandContext
): Promise<CommandResult> {
  const command = await getCustomCommand(name)

  if (!command) {
    return {
      type: 'text',
      content: `Unknown command: /${name}`,
    }
  }

  if (!command.prompt_template) {
    return {
      type: 'text',
      content: `Command /${name} has no prompt template configured.`,
    }
  }

  const query = args.join(' ')

  // Build context string from sources
  const contextText = context.sources
    .map((s, i) => `[Source ${i + 1}]: ${s.content}`)
    .join('\n\n')

  // Build sources list
  const sourcesText = context.sources
    .map((s, i) => `${i + 1}. ${s.documentTitle || 'Untitled'} (Similarity: ${s.similarity?.toFixed(2) ?? 'N/A'})`)
    .join('\n')

  // Replace template variables
  let prompt = command.prompt_template
  prompt = prompt.replace(/\{\{query\}\}/g, query)
  prompt = prompt.replace(/\{\{context\}\}/g, contextText || 'No relevant context found.')
  prompt = prompt.replace(/\{\{sources\}\}/g, sourcesText || 'No sources available.')

  // Send to LLM via chat endpoint
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : ''}${typeof window !== 'undefined' ? '' : process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        documentIds: context.documentIds,
        isCustomCommand: true,
      }),
    })

    if (!response.ok) {
      return {
        type: 'text',
        content: `Failed to execute command /${name}. The LLM service returned an error.`,
      }
    }

    // Read the streaming response
    const reader = response.body?.getReader()
    if (!reader) {
      return {
        type: 'text',
        content: `Failed to read response from command /${name}.`,
      }
    }

    const decoder = new TextDecoder()
    let content = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'text') {
              content += parsed.content
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    }

    return {
      type: 'text',
      content: content || `Command /${name} completed with no output.`,
    }
  } catch (error) {
    console.error(`Custom command /${name} error:`, error)
    return {
      type: 'text',
      content: `Failed to execute command /${name}. Please try again.`,
    }
  }
}
