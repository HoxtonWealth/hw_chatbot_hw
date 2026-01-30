'use client'

import { useEffect, useState, useCallback } from 'react'

interface ProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  chunk_count: number
  error_message?: string
}

export function useProcessingStatus(documentId: string | null) {
  const [status, setStatus] = useState<ProcessingStatus | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const connect = useCallback(() => {
    if (!documentId) return

    const eventSource = new EventSource(`/api/ingest/status/${documentId}`)

    eventSource.onopen = () => {
      setIsConnected(true)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setStatus(data)

        // Close connection when processing is done
        if (data.status === 'completed' || data.status === 'failed') {
          eventSource.close()
          setIsConnected(false)
        }
      } catch (error) {
        console.error('SSE parse error:', error)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      setIsConnected(false)
    }

    return () => {
      eventSource.close()
      setIsConnected(false)
    }
  }, [documentId])

  useEffect(() => {
    const cleanup = connect()
    return cleanup
  }, [connect])

  return { status, isConnected }
}
