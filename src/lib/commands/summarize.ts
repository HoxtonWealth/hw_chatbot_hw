import { CommandResult, CommandContext } from './index'

/**
 * Handles /summarize command.
 * Takes a topic or document name and sends a summarization prompt to the chat API.
 */
export async function executeSummarize(
  args: string[],
  context: CommandContext
): Promise<CommandResult> {
  const topic = args.join(' ').trim()

  if (!topic) {
    return {
      type: 'text',
      content:
        '**Usage:** `/summarize [topic or document name]`\n\n' +
        'Example: `/summarize Sales Playbook`\n\n' +
        'Generates a condensed overview of the specified topic or document from the knowledge base.',
    }
  }

  const prompt = `Provide a concise summary of "${topic}". ` +
    `Include the key points, main themes, and important details. ` +
    `Structure the summary with bullet points for clarity.`

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
      throw new Error('Failed to get summary from API')
    }

    const content = await readStreamedResponse(response)

    return {
      type: 'text',
      content,
    }
  } catch (error) {
    return {
      type: 'text',
      content: `Error generating summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
