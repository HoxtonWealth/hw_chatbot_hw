'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, Loader2, MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ChatMessage } from './ChatMessage'
import { CitationPanel } from './CitationPanel'
import { ConfidenceIndicator } from './ConfidenceIndicator'
import { CommandPalette, type CommandDefinition } from './CommandPalette'
import { Source } from '@/lib/rag'
import { GlossaryEntry } from '@/lib/supabase'
import { isCommand, parseCommand, executeCommand, type CommandContext, VALID_COMMANDS } from '@/lib/commands'

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
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryEntry[]>([])
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [commandFilter, setCommandFilter] = useState('')
  const [customCommands, setCustomCommands] = useState<Array<{ name: string; description: string; usage_hint?: string }>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setSources([])
    setConfidence(0)
    setError(null)
  }

  // Derive custom command names for validation
  const customCommandNames = customCommands.map((c) => c.name)

  // Fetch glossary terms and custom commands on mount
  useEffect(() => {
    async function fetchGlossary() {
      try {
        const res = await fetch('/api/glossary')
        if (res.ok) {
          const data = await res.json()
          if (data.success && Array.isArray(data.terms)) {
            setGlossaryTerms(data.terms)
          }
        }
      } catch (err) {
        console.warn('Failed to fetch glossary terms:', err)
      }
    }
    async function fetchCustomCommands() {
      try {
        const res = await fetch('/api/commands')
        if (res.ok) {
          const data = await res.json()
          if (data.success && Array.isArray(data.commands)) {
            // Filter to only non-builtin commands for the palette
            const custom = data.commands
              .filter((c: { is_builtin: boolean }) => !c.is_builtin)
              .map((c: { name: string; description: string; usage_hint?: string }) => ({
                name: c.name,
                description: c.description,
                usage_hint: c.usage_hint,
              }))
            setCustomCommands(custom)
          }
        }
      } catch (err) {
        console.warn('Failed to fetch custom commands:', err)
      }
    }
    fetchGlossary()
    fetchCustomCommands()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Detect slash commands in input
  const handleInputChange = (value: string) => {
    setInput(value)

    if (value.startsWith('/')) {
      const afterSlash = value.slice(1).split(/\s/)[0] || ''
      setCommandFilter(afterSlash)
      // Only show palette if user is still typing the command name (no space yet)
      const hasSpace = value.indexOf(' ') > 0
      setCommandPaletteOpen(!hasSpace)
    } else {
      setCommandPaletteOpen(false)
      setCommandFilter('')
    }
  }

  const handleCommandSelect = (cmd: CommandDefinition) => {
    setCommandPaletteOpen(false)
    setCommandFilter('')

    // For /export and /sources, execute immediately
    if (cmd.name === 'export' || cmd.name === 'sources') {
      setInput(`/${cmd.name}`)
      // Trigger submit after a tick so the input is set
      setTimeout(() => {
        handleCommandSubmit(`/${cmd.name}`)
      }, 0)
    } else {
      // For /compare, /summarize, and custom commands, fill the usage template so user can edit args
      setInput(cmd.usage)
    }
  }

  const handleCommandSubmit = async (commandInput: string) => {
    const parsed = parseCommand(commandInput, customCommandNames)
    if (!parsed) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: commandInput,
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const context: CommandContext = {
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        sources,
        documentIds,
      }

      const result = await executeCommand(parsed.command, parsed.args, context)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.content,
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Command execution failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Close command palette if open
    setCommandPaletteOpen(false)
    setCommandFilter('')

    // Check if this is a slash command (built-in or custom)
    if (isCommand(input, customCommandNames)) {
      await handleCommandSubmit(input)
      return
    }

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
          messageCount: messages.length + 1,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
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

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* New Chat Button */}
          {messages.length > 0 && (
            <div className="flex justify-end px-4 pt-3">
              <Button variant="ghost" size="sm" onClick={handleNewChat}>
                <MessageSquarePlus className="h-4 w-4 mr-1.5" />
                New Chat
              </Button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-4">
                  <p>Ask a question about your documents...</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      'What topics are covered in my documents?',
                      'Summarize the key takeaways',
                      'What are the main recommendations?',
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setInput(q)
                        }}
                        className="text-xs border rounded-full px-3 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm">
                    Type <span className="font-mono bg-muted px-1 py-0.5 rounded">/</span> for slash commands
                  </p>
                </div>
              </div>
            )}

            {messages.map((message, idx) => {
              const lastAssistantIdx = messages.findLastIndex(m => m.role === 'assistant')
              return (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  messageId={message.id}
                  isLatest={message.role === 'assistant' && idx === lastAssistantIdx}
                  glossaryTerms={glossaryTerms}
                />
              )
            })}

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
            <div className="relative">
              <CommandPalette
                isOpen={commandPaletteOpen}
                filter={commandFilter}
                onSelect={handleCommandSelect}
                onClose={() => {
                  setCommandPaletteOpen(false)
                  setCommandFilter('')
                }}
                customCommands={customCommands}
              />
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !commandPaletteOpen && input.trim() && !isLoading) {
                      e.preventDefault()
                      handleSubmit(e as unknown as FormEvent)
                    }
                  }}
                  placeholder="Ask a question or type / for commands..."
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
            </div>
          </form>
        </Card>
      </div>

      {/* Citation Panel - hidden on mobile */}
      <div className="hidden md:block">
        <CitationPanel sources={sources} />
      </div>
    </div>
  )
}
