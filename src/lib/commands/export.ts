import { CommandResult, CommandContext } from './index'

/**
 * Handles /export command.
 * Formats the current conversation as markdown and copies it to the clipboard.
 * This is a purely client-side operation.
 */
export async function executeExport(context: CommandContext): Promise<CommandResult> {
  const { messages, sources } = context

  if (messages.length === 0) {
    return {
      type: 'text',
      content: 'No conversation to export. Start a conversation first.',
    }
  }

  const markdown = formatConversationAsMarkdown(messages, sources)

  try {
    await navigator.clipboard.writeText(markdown)

    return {
      type: 'action',
      content: 'Conversation exported to clipboard as Markdown. You can now paste it anywhere.',
      data: { characterCount: markdown.length, messageCount: messages.length },
    }
  } catch {
    // Clipboard API may fail in some contexts; return the markdown as content instead
    return {
      type: 'text',
      content:
        'Could not copy to clipboard automatically. Here is the exported conversation:\n\n---\n\n' +
        markdown,
    }
  }
}

function formatConversationAsMarkdown(
  messages: Array<{ role: string; content: string }>,
  sources: Array<{ index: number; documentTitle?: string; content: string; similarity: number }>
): string {
  const lines: string[] = []
  const timestamp = new Date().toISOString()

  lines.push('# GTM Knowledge Base - Conversation Export')
  lines.push(`*Exported on ${new Date(timestamp).toLocaleString()}*`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const msg of messages) {
    const roleLabel = msg.role === 'user' ? '**You**' : '**Assistant**'
    lines.push(`### ${roleLabel}`)
    lines.push('')
    lines.push(msg.content)
    lines.push('')
  }

  if (sources.length > 0) {
    lines.push('---')
    lines.push('')
    lines.push('## Sources')
    lines.push('')
    for (const source of sources) {
      const title = source.documentTitle || 'Unknown document'
      const confidence = Math.round(source.similarity * 100)
      lines.push(`- **[${source.index}]** ${title} (${confidence}% match)`)
    }
    lines.push('')
  }

  lines.push('---')
  lines.push('*Exported from GTM Knowledge Base*')

  return lines.join('\n')
}
