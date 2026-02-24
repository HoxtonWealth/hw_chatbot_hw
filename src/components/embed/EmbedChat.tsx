'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmbedMessage, TypingIndicator } from './EmbedMessage'
import { Send, MessageSquarePlus, ChevronDown } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: number
}

interface Source {
  index: number
  documentTitle: string
  sectionHeader?: string
  similarity: number
}

// --- Welcome message (render-only, not persisted or sent as history) ---
const WELCOME_MESSAGE = `Hi there — I'm Hoxton Wealth's virtual advisor.

I can help with questions about pension transfers, international investment, retirement planning, tax-efficient strategies, and more.

What's on your mind?`

const WELCOME_SUGGESTIONS = [
  'Tell me about pension transfers',
  'How does international investment work?',
  'What areas does Hoxton cover?',
]

function formatTime(ts?: number): string {
  const d = ts ? new Date(ts) : new Date()
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      createdAt: Date.now(),
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setStreamingContent('')
    setSources([])
    setSuggestions([])

    try {
      const recentHistory = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/chat/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          messageCount: messages.length + 1,
          history: recentHistory,
        }),
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
        createdAt: Date.now(),
      }
      setMessages(prev => [...prev, assistantMessage])
      setStreamingContent('')
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        createdAt: Date.now(),
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
      <div className="flex items-center px-5 py-4 bg-white">
        <span className="text-lg font-semibold text-neutral-900 flex-1">
          Team Hoxton Wealth {'\u{1F44B}'}
        </span>
        {messages.length > 0 && (
          <button
            onClick={handleNewChat}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors"
            title="New Chat"
          >
            <MessageSquarePlus className="h-4.5 w-4.5" />
          </button>
        )}
        <button
          onClick={() => window.parent.postMessage({ type: 'hw-chat-close' }, '*')}
          className="p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors"
          title="Minimize"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-3">
        {messages.length === 0 && !isLoading && (
          <>
            <EmbedMessage
              role="assistant"
              content={WELCOME_MESSAGE}
              timestamp={formatTime()}
            />
            <div className="flex flex-wrap gap-1.5 mt-1 mb-3 ml-[42px]">
              {WELCOME_SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-900 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </>
        )}

        {messages.map(msg => (
          <EmbedMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            timestamp={msg.createdAt ? formatTime(msg.createdAt) : undefined}
          />
        ))}

        {isLoading && !streamingContent && <TypingIndicator />}

        {streamingContent && (
          <EmbedMessage role="assistant" content={streamingContent} isStreaming />
        )}

        {/* Sources (shown after assistant response) */}
        {sources.length > 0 && messages.length > 0 && !isLoading && (
          <div className="mt-1 mb-3 ml-[42px]">
            <p className="text-[11px] text-neutral-400 mb-1">Sources:</p>
            <div className="flex flex-wrap gap-1">
              {sources.slice(0, 3).map((source) => (
                <span
                  key={source.index}
                  className="inline-flex items-center text-[11px] bg-neutral-50 text-neutral-500 rounded px-2 py-0.5 border border-neutral-100"
                >
                  [{source.index}] {source.documentTitle}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up suggestion chips */}
        {!isLoading && !streamingContent && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1 mb-3 ml-[42px]">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => sendMessage(suggestion)}
                className="text-xs px-3 py-1.5 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-900 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 bg-white">
        <div className="relative">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Write a reply"
            disabled={isLoading}
            className="w-full px-4 py-3 pr-10 text-sm bg-neutral-50 rounded-full border border-neutral-200 outline-none focus:border-[#1B3B36]/30 focus:ring-1 focus:ring-[#1B3B36]/20 placeholder:text-neutral-400 transition-colors disabled:opacity-50"
            autoFocus
          />
          {input.trim() && (
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-[#1B3B36] text-white hover:bg-[#1B3B36]/90 transition-colors disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
