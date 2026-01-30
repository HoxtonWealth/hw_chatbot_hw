'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ChatMessage } from './ChatMessage'
import { CitationPanel } from './CitationPanel'
import { ConfidenceIndicator } from './ConfidenceIndicator'
import { Source } from '@/lib/rag'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatInterfaceProps {
  conversationId?: string
  documentIds?: string[]
}

export function ChatInterface({ conversationId, documentIds }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [confidence, setConfidence] = useState<number>(0)
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          documentIds,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let assistantContent = ''
      const assistantId = (Date.now() + 1).toString()

      // Add empty assistant message
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])

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

              if (parsed.type === 'metadata') {
                setSources(parsed.sources || [])
                setConfidence(parsed.confidence || 0)
              } else if (parsed.type === 'text') {
                assistantContent += parsed.content
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId ? { ...m, content: assistantContent } : m
                  )
                )
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCitationClick = (citationNumber: number) => {
    const source = sources.find(s => s.index === citationNumber)
    if (source) {
      setSelectedSource(source)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Ask a question about your documents...</p>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                onCitationClick={handleCitationClick}
              />
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}

            {error && (
              <div className="text-destructive text-sm">
                Error: {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Confidence Indicator */}
          {messages.length > 0 && !isLoading && sources.length > 0 && (
            <div className="px-4 py-2 border-t">
              <ConfidenceIndicator confidence={confidence} sourcesCount={sources.length} />
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Citation Panel */}
      <CitationPanel
        sources={sources}
        selectedSource={selectedSource}
        onSourceSelect={setSelectedSource}
        onClose={() => setSelectedSource(null)}
      />
    </div>
  )
}
