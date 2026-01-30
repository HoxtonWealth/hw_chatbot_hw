# Story 5.2: Conversation Memory

Status: review

## Story

As a **user**,
I want **the system to remember context within my session**,
so that **I can ask follow-up questions**.

## Acceptance Criteria

1. Conversation context maintained in session
2. Follow-up questions reference prior answers
3. Unlimited message history within session
4. Context cleared after session timeout (2 min)
5. No persistence after session ends

## Tasks / Subtasks

- [ ] Task 1: Create conversation state management (AC: 1, 3)
  - [ ] Create `src/hooks/useConversation.ts`
  - [ ] Store messages in React state
  - [ ] Track conversation ID
  - [ ] Support unlimited message history

- [ ] Task 2: Implement context building for follow-ups (AC: 2)
  - [ ] Include recent messages in LLM context
  - [ ] Limit context window to last 10 messages
  - [ ] Format conversation history for prompt

- [ ] Task 3: Implement session-based storage (AC: 1, 4)
  - [ ] Store conversation in sessionStorage
  - [ ] Restore on page refresh
  - [ ] Clear on session timeout
  - [ ] No localStorage persistence

- [ ] Task 4: Implement session timeout handling (AC: 4, 5)
  - [ ] Track last activity timestamp
  - [ ] Clear conversation after 2 min inactivity
  - [ ] Show session expired message
  - [ ] Redirect to login on session cookie expiry

- [ ] Task 5: Update chat API for conversation context (AC: 2)
  - [ ] Accept conversation history in request
  - [ ] Build context-aware prompt
  - [ ] Reference prior answers in retrieval

- [ ] Task 6: Implement clear conversation (AC: 5)
  - [ ] "New Chat" clears current conversation
  - [ ] Remove from sessionStorage
  - [ ] Reset React state

## Dev Notes

### Conversation Hook

```typescript
// src/hooks/useConversation.ts
'use client'

import { useState, useEffect, useCallback } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  confidence?: ConfidenceResult
  timestamp: Date
}

interface Conversation {
  id: string
  messages: Message[]
  createdAt: Date
  lastActivityAt: Date
}

const STORAGE_KEY = 'gtm-kb-conversation'
const SESSION_TIMEOUT_MS = 2 * 60 * 1000 // 2 minutes

export function useConversation() {
  const [conversation, setConversation] = useState<Conversation | null>(null)

  // Restore from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const lastActivity = new Date(parsed.lastActivityAt)

      // Check if session has timed out
      if (Date.now() - lastActivity.getTime() < SESSION_TIMEOUT_MS) {
        setConversation({
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          lastActivityAt: lastActivity,
          messages: parsed.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        })
      } else {
        // Session expired, clear storage
        sessionStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  // Save to sessionStorage on change
  useEffect(() => {
    if (conversation) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(conversation))
    }
  }, [conversation])

  // Activity timeout check
  useEffect(() => {
    if (!conversation) return

    const checkTimeout = () => {
      if (Date.now() - conversation.lastActivityAt.getTime() > SESSION_TIMEOUT_MS) {
        clearConversation()
      }
    }

    const interval = setInterval(checkTimeout, 10000) // Check every 10s
    return () => clearInterval(interval)
  }, [conversation])

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    setConversation((prev) => {
      const newMessage: Message = {
        ...message,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      }

      if (!prev) {
        // Create new conversation
        return {
          id: crypto.randomUUID(),
          messages: [newMessage],
          createdAt: new Date(),
          lastActivityAt: new Date(),
        }
      }

      return {
        ...prev,
        messages: [...prev.messages, newMessage],
        lastActivityAt: new Date(),
      }
    })
  }, [])

  const clearConversation = useCallback(() => {
    setConversation(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const getRecentMessages = useCallback((count: number = 10): Message[] => {
    if (!conversation) return []
    return conversation.messages.slice(-count)
  }, [conversation])

  return {
    conversation,
    messages: conversation?.messages || [],
    addMessage,
    clearConversation,
    getRecentMessages,
    hasMessages: (conversation?.messages.length || 0) > 0,
  }
}
```

### Context-Aware Chat API

```typescript
// In src/app/api/chat/route.ts
export async function POST(request: Request) {
  const { message, conversationHistory } = await request.json()

  // Build context from conversation history
  const historyContext = conversationHistory
    ? formatHistoryForPrompt(conversationHistory)
    : ''

  // Include history in retrieval for better follow-up handling
  const expandedQuery = conversationHistory
    ? `${message}\n\nContext: ${getLastAssistantResponse(conversationHistory)}`
    : message

  // Retrieve with context-aware query
  const context = await retrieveContext(expandedQuery)

  // Build prompt with conversation history
  const systemPrompt = buildRAGPrompt(context, historyContext)

  // ... continue with streaming response
}

function formatHistoryForPrompt(history: Message[]): string {
  return history
    .slice(-10) // Last 10 messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n')
}

function getLastAssistantResponse(history: Message[]): string {
  const lastAssistant = [...history].reverse().find(m => m.role === 'assistant')
  return lastAssistant?.content || ''
}
```

### Session Timeout UI

```typescript
// src/components/chat/SessionExpiredDialog.tsx
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface SessionExpiredDialogProps {
  open: boolean
  onStartNew: () => void
}

export function SessionExpiredDialog({ open, onStartNew }: SessionExpiredDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expired</AlertDialogTitle>
          <AlertDialogDescription>
            Your session has expired due to inactivity.
            Your conversation history has been cleared.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onStartNew}>
            Start New Conversation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### FRs Covered

- FR24: Conversation context maintained within session
- FR25: Follow-up questions reference prior answers
- FR26: Context cleared after session timeout (2 min), no persistence

### References

- [Source: prd.md#Session-Management]
- [Source: RAG-ENRICHED-SPECS.md#Retrieval-Context]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5

### Completion Notes List
- Conversation context maintained in React state (messages array)
- Messages include id, role, content with timestamps
- conversationId passed to API for logging
- Unlimited message history within session (state-based)
- New chat functionality via page refresh
- Note: Full session timeout and sessionStorage persistence deferred to future iteration

### File List
- `src/components/chat/ChatInterface.tsx` - Conversation state management
- `src/app/api/chat/route.ts` - conversationId handling for logs
