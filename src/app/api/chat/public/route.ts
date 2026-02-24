import { streamText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { NextRequest } from 'next/server'
import { retrieveContext } from '@/lib/retrieval/pipeline'
import { RETRIEVAL_CONFIG } from '@/lib/retrieval/config'
import { buildRAGPrompt, buildEmptyContextPrompt, generateFollowUpSuggestions } from '@/lib/rag'

export const maxDuration = 30

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, messageCount = 0, history: rawHistory } = body

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate and sanitize conversation history (cap to last 6 messages)
    const history: { role: 'user' | 'assistant'; content: string }[] = []
    if (Array.isArray(rawHistory)) {
      for (const msg of rawHistory.slice(-6)) {
        if (
          msg &&
          typeof msg.content === 'string' &&
          msg.content.trim() &&
          (msg.role === 'user' || msg.role === 'assistant')
        ) {
          history.push({ role: msg.role, content: msg.content.trim() })
        }
      }
    }

    // 1. Retrieve relevant context (reuses existing pipeline)
    const { chunks } = await retrieveContext(
      message,
      undefined,
      {
        expandQueries: RETRIEVAL_CONFIG.expandQueries,
        useReranking: RETRIEVAL_CONFIG.useReranking,
        topK: RETRIEVAL_CONFIG.topK,
      }
    )

    // 2. Build prompt
    const hasContext = chunks.length > 0
    const ragResult = hasContext ? buildRAGPrompt(chunks, messageCount) : null
    const systemPrompt = ragResult
      ? ragResult.systemPrompt
      : buildEmptyContextPrompt(messageCount)
    const sources = ragResult?.sources ?? []
    const confidence = ragResult?.confidence ?? 0

    const followUpSuggestions = generateFollowUpSuggestions(chunks, messageCount)

    // 3. Stream response
    const result = streamText({
      model: createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })(
        process.env.CHAT_MODEL || 'openai/gpt-4o-mini'
      ),
      system: systemPrompt,
      messages: [...history, { role: 'user' as const, content: message }],
    })

    const stream = result.textStream
    const encoder = new TextEncoder()

    const metadataChunk = JSON.stringify({
      type: 'metadata',
      sources,
      confidence,
      suggestions: followUpSuggestions,
    })

    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`data: ${metadataChunk}\n\n`))

        for await (const chunk of stream) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`)
          )
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Public chat API error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
}
