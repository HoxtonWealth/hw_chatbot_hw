'use client'

import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  onCitationClick?: (citationNumber: number) => void
}

export function ChatMessage({ role, content, onCitationClick }: ChatMessageProps) {
  const isUser = role === 'user'

  // Parse and render content with clickable citations
  const renderContent = () => {
    // Match citation patterns like [1], [2], etc.
    const parts = content.split(/(\[\d+\])/g)

    return parts.map((part, index) => {
      const match = part.match(/^\[(\d+)\]$/)
      if (match && onCitationClick) {
        const citationNumber = parseInt(match[1], 10)
        return (
          <button
            key={index}
            onClick={() => onCitationClick(citationNumber)}
            className="inline-flex items-center justify-center text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded px-1 mx-0.5 transition-colors"
          >
            {part}
          </button>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        <div className="whitespace-pre-wrap text-sm">
          {isUser ? content : renderContent()}
        </div>
      </div>
    </div>
  )
}
