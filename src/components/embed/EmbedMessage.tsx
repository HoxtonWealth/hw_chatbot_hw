'use client'

import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'

interface EmbedMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

const BOOKING_URL_PATTERN = /(https?:\/\/calendly\.com\/[^\s)]+)/g

function renderContent(content: string) {
  const parts = content.split(BOOKING_URL_PATTERN)

  if (parts.length === 1) return content

  return parts.map((part, i) => {
    if (BOOKING_URL_PATTERN.test(part)) {
      BOOKING_URL_PATTERN.lastIndex = 0
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mt-3 mb-1 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors w-fit no-underline"
        >
          <Calendar className="h-4 w-4" />
          Book a free consultation
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function EmbedMessage({ role, content, isStreaming }: EmbedMessageProps) {
  return (
    <div
      className={cn(
        'flex w-full mb-3',
        role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          role === 'user'
            ? 'bg-neutral-900 text-white rounded-br-md'
            : 'bg-neutral-100 text-neutral-900 rounded-bl-md'
        )}
      >
        {role === 'assistant' ? renderContent(content) : content}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-neutral-400 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  )
}
