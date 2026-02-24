'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmbedMessage, TypingIndicator } from './EmbedMessage'
import { Send, MessageSquarePlus } from 'lucide-react'

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

// --- localStorage persistence helpers ---
const STORAGE_KEY = 'hw-embed-chat'
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function loadConversation(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const { messages, savedAt } = JSON.parse(raw)
    if (Date.now() - savedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return []
    }
    return messages ?? []
  } catch {
    return []
  }
}

function saveConversation(messages: Message[]) {
  try {
    if (messages.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, savedAt: Date.now() }))
  } catch {
    // Storage full or unavailable — silently skip
  }
}

function clearConversation() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Silently skip
  }
}

export function EmbedChat() {
  const [messages, setMessages] = useState<Message[]>(() => loadConversation())
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Persist messages to localStorage
  useEffect(() => {
    saveConversation(messages)
  }, [messages])

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
  }, [messages, streamingContent, isLoading, scrollToBottom])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setStreamingContent('')
    setSources([])
    setSuggestions([])

    try {
      const response = await fetch('/api/chat/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), messageCount: messages.length + 1 }),
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
              setSuggestions(parsed.suggestions || [])
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
  }, [isLoading, messages.length])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleNewChat = () => {
    setMessages([])
    setSources([])
    setSuggestions([])
    clearConversation()
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-white">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-sm font-medium text-neutral-900 flex-1">Knowledge Base</span>
        {messages.length > 0 && (
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
            title="New Chat"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            New Chat
          </button>
        )}
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

        {isLoading && !streamingContent && <TypingIndicator />}

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

        {/* Follow-up suggestion chips */}
        {!isLoading && !streamingContent && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 mb-3 px-1">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => sendMessage(suggestion)}
                className="text-xs px-3 py-1.5 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
              >
                {suggestion}
              </button>
            ))}
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
