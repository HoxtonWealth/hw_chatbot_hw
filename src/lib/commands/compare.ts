import { CommandResult, CommandContext } from './index'

/**
 * Parses /compare arguments in the format: "doc1 vs doc2 topic"
 * Returns the two document names and optional topic, or null if parsing fails.
 */
function parseCompareArgs(args: string[]): { doc1: string; doc2: string; topic: string } | null {
  const full = args.join(' ')
  // Match: doc1 vs doc2 [optional topic]
  const match = full.match(/^(.+?)\s+vs\s+(.+?)(?:\s+(.+))?$/i)
  if (!match) return null

  return {
    doc1: match[1].trim(),
    doc2: match[2].trim(),
    topic: match[3]?.trim() || '',
  }
}

/**
 * Handles /compare command.
 * Sends a comparison prompt to the chat API and returns a table-type result.
 */
export async function executeCompare(
  args: string[],
  context: CommandContext
): Promise<CommandResult> {
  const parsed = parseCompareArgs(args)

  if (!parsed) {
    return {
      type: 'text',
      content:
        '**Usage:** `/compare [document1] vs [document2] [topic]`\n\n' +
        'Example: `/compare Sales Playbook vs Marketing Guide pricing strategy`\n\n' +
        'Compares two documents on a given topic using the knowledge base.',
    }
  }

  const { doc1, doc2, topic } = parsed
  const topicClause = topic ? ` regarding "${topic}"` : ''

  const prompt = `Compare the documents "${doc1}" and "${doc2}"${topicClause}. ` +
    `Provide a structured comparison highlighting key similarities and differences. ` +
    `Use a table format where possible with columns: Aspect, ${doc1}, ${doc2}.`

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        documentIds: context.documentIds,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to get comparison from API')
    }

    const content = await readStreamedResponse(response)

    return {
      type: 'table',
      content,
      data: { doc1, doc2, topic },
    }
  } catch (error) {
    return {
      type: 'text',
      content: `Error running comparison: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Reads a streamed SSE response from the chat API and returns the full text.
 */
async function readStreamedResponse(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No reader available')

  const decoder = new TextDecoder()
  let result = ''

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
            result += parsed.content
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }
  }

  return result
}
