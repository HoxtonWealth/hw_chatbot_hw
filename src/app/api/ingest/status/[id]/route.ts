import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false

      const sendStatus = async () => {
        if (isClosed) return

        try {
          const { data: doc, error } = await supabaseAdmin
            .from('documents')
            .select('status, chunk_count, error_message')
            .eq('id', id)
            .single()

          if (error || !doc) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Document not found' })}\n\n`)
            )
            controller.close()
            isClosed = true
            return
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(doc)}\n\n`))

          if (doc.status === 'completed' || doc.status === 'failed') {
            controller.close()
            isClosed = true
            return
          }

          // Poll every second
          setTimeout(sendStatus, 1000)
        } catch (error) {
          console.error('SSE error:', error)
          controller.close()
          isClosed = true
        }
      }

      await sendStatus()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
