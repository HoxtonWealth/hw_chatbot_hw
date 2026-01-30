# Story 5.1: Chat Interface

Status: review

## Story

As a **user**,
I want **a chat interface to query the knowledge base**,
so that **I can ask questions naturally**.

## Acceptance Criteria

1. Chat page with message list
2. User messages right-aligned, assistant left-aligned
3. Message input with send button
4. Streaming response display with typing indicator
5. Auto-scroll to latest message
6. New chat button to clear conversation

## Tasks / Subtasks

- [ ] Task 1: Create chat page layout (AC: 1)
  - [ ] Create `src/app/chat/page.tsx`
  - [ ] Full-height layout with header
  - [ ] Message area + input area structure
  - [ ] Use shadcn Card for container

- [ ] Task 2: Create ChatMessage component (AC: 2, 4)
  - [ ] Create `src/components/chat/ChatMessage.tsx`
  - [ ] User messages: right-aligned, blue background
  - [ ] Assistant messages: left-aligned, gray background
  - [ ] Typing indicator during streaming
  - [ ] Integrate CitationPanel and ConfidenceIndicator

- [ ] Task 3: Create ChatInput component (AC: 3)
  - [ ] Create `src/components/chat/ChatInput.tsx`
  - [ ] Text input with placeholder
  - [ ] Send button (icon or text)
  - [ ] Disable during loading
  - [ ] Handle Enter key submission

- [ ] Task 4: Implement Vercel AI SDK integration (AC: 4)
  - [ ] Use `useChat` hook from `ai/react`
  - [ ] Connect to `/api/chat` endpoint
  - [ ] Handle streaming messages
  - [ ] Extract sources and confidence from stream

- [ ] Task 5: Implement auto-scroll (AC: 5)
  - [ ] Create `src/hooks/useAutoScroll.ts`
  - [ ] Scroll to bottom on new messages
  - [ ] Respect user scroll position
  - [ ] Use shadcn ScrollArea

- [ ] Task 6: Implement new chat functionality (AC: 6)
  - [ ] Add "New Chat" button in header
  - [ ] Clear all messages
  - [ ] Reset conversation state
  - [ ] Optionally redirect to /chat

## Dev Notes

### Chat Page Layout

```typescript
// src/app/chat/page.tsx
import { ChatInterface } from '@/components/chat/ChatInterface'

export default function ChatPage() {
  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold">Knowledge Base Chat</h1>
        <NewChatButton />
      </header>
      <ChatInterface />
    </div>
  )
}
```

### ChatInterface Component

```typescript
// src/components/chat/ChatInterface.tsx
'use client'

import { useChat } from 'ai/react'
import { useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'

export function ChatInterface() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    data,
    error,
  } = useChat({
    api: '/api/chat',
    onFinish: (message) => {
      // Optional: save to conversation history
    },
  })

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <WelcomeMessage />
          )}

          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              sources={data?.sources}
              confidence={data?.confidence}
              isStreaming={isLoading && message === messages[messages.length - 1]}
            />
          ))}

          {error && (
            <ErrorState type="error" message={error.message} />
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            value={input}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            disabled={isLoading}
            placeholder="Ask a question about your documents..."
          />
        </div>
      </div>
    </div>
  )
}
```

### ChatMessage Component

```typescript
// src/components/chat/ChatMessage.tsx
'use client'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { CitationPanel } from '@/components/citations/CitationPanel'
import { ConfidenceIndicator } from '@/components/citations/ConfidenceIndicator'
import { User, Bot } from 'lucide-react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  confidence?: ConfidenceResult
  isStreaming?: boolean
}

export function ChatMessage({
  role,
  content,
  sources,
  confidence,
  isStreaming,
}: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <Avatar className="h-8 w-8">
        <AvatarFallback className={isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn(
        'flex-1 space-y-2',
        isUser ? 'text-right' : 'text-left'
      )}>
        <div className={cn(
          'inline-block p-3 rounded-lg max-w-[80%]',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}>
          {isStreaming && !content ? (
            <div className="flex gap-1">
              <Skeleton className="h-2 w-2 rounded-full animate-bounce" />
              <Skeleton className="h-2 w-2 rounded-full animate-bounce delay-100" />
              <Skeleton className="h-2 w-2 rounded-full animate-bounce delay-200" />
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{content}</p>
          )}
        </div>

        {!isUser && confidence && (
          <ConfidenceIndicator
            score={confidence.score}
            level={confidence.level}
            factors={confidence.factors}
          />
        )}

        {!isUser && sources && sources.length > 0 && (
          <CitationPanel sources={sources} />
        )}
      </div>
    </div>
  )
}
```

### ChatInput Component

```typescript
// src/components/chat/ChatInput.tsx
'use client'

import { FormEvent, KeyboardEvent } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Send, Loader2 } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
}: ChatInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.form
      if (form) form.requestSubmit()
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Textarea
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="min-h-[44px] resize-none"
      />
      <Button type="submit" disabled={disabled || !value.trim()}>
        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  )
}
```

### FRs Covered

- FR27: Chat interface with natural question input

### References

- [Source: RAG-ENRICHED-SPECS.md#Vercel-AI-SDK-Integration]
- [Source: RAG-ENRICHED-SPECS.md#UI-Component-Architecture]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5

### Completion Notes List
- Created full chat page with header navigation
- ChatInterface with message list and streaming SSE handling
- User messages right-aligned, assistant left-aligned
- Input field with send button and disabled state during loading
- Auto-scroll to latest message via useRef
- Typing indicator (Loader2 spinner) during streaming
- Citation panel integration for source display
- Confidence indicator below messages

### File List
- `src/app/chat/page.tsx` - Chat page with navigation
- `src/components/chat/ChatInterface.tsx` - Main chat component
- `src/components/chat/ChatMessage.tsx` - Message rendering with citation links
- `src/components/chat/CitationPanel.tsx` - Source display panel
- `src/components/chat/ConfidenceIndicator.tsx` - Confidence UI
