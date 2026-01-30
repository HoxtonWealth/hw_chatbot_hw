'use client'

import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FeedbackButtons } from './FeedbackButtons'
import { GlossaryEntry } from '@/lib/supabase'
import { highlightGlossaryTerms } from '@/lib/glossary-highlighter'
import React from 'react'

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  messageId?: string
  onCitationClick?: (citationNumber: number) => void
  glossaryTerms?: GlossaryEntry[]
}

export function ChatMessage({ role, content, messageId, onCitationClick, glossaryTerms }: ChatMessageProps) {
  const isUser = role === 'user'

  // Apply glossary highlighting to a text segment
  const applyGlossaryHighlighting = (text: string, key: string): React.ReactNode => {
    if (!glossaryTerms || glossaryTerms.length === 0) {
      return <span key={key}>{text}</span>
    }
    const highlighted = highlightGlossaryTerms(text, glossaryTerms)
    return <React.Fragment key={key}>{highlighted}</React.Fragment>
  }

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
      return applyGlossaryHighlighting(part, `part-${index}`)
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

      <div className="flex flex-col">
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
        {!isUser && messageId && (
          <FeedbackButtons messageId={messageId} />
        )}
      </div>
    </div>
  )
}
