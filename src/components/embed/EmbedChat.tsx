'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmbedMessage } from './EmbedMessage'
import { Send } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface Source {
  index: number
  documentTitle: string
  sectionHeader?: string
  similarity: number
}

export function EmbedChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setStreamingContent('')
    setSources([])

    try {
      const response = await fetch('/api/chat/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, messageCount: messages.length + 1 }),
      })

      if (!response.ok) {
        throw new Error(response.status === 429 ? 'Too many requests. Please wait.' : 'Something went wrong.')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)

          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)

            if (parsed.type === 'metadata') {
              setSources(parsed.sources || [])
            } else if (parsed.type === 'text') {
              accumulated += parsed.content
              setStreamingContent(accumulated)
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }

      // Finalize assistant message
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: accumulated,
      }
      setMessages(prev => [...prev, assistantMessage])
      setStreamingContent('')
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      }
      setMessages(prev => [...prev, errorMessage])
      setStreamingContent('')
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-white">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-sm font-medium text-neutral-900">Knowledge Base</span>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
            Ask me anything about our knowledge base
          </div>
        )}

        {messages.map(msg => (
          <EmbedMessage key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {streamingContent && (
          <EmbedMessage role="assistant" content={streamingContent} isStreaming />
        )}

        {/* Sources (shown after assistant response) */}
        {sources.length > 0 && messages.length > 0 && !isLoading && (
          <div className="mt-2 mb-3 px-1">
            <p className="text-xs text-neutral-400 mb-1">Sources:</p>
            <div className="flex flex-wrap gap-1">
              {sources.slice(0, 3).map((source) => (
                <span
                  key={source.index}
                  className="inline-flex items-center text-xs bg-neutral-100 text-neutral-600 rounded px-2 py-0.5"
                >
                  [{source.index}] {source.documentTitle}
                </span>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            disabled={isLoading}
            className="flex-1 text-sm"
            autoFocus
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
