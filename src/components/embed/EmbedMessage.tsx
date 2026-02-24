'use client'

import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'

interface EmbedMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

// Matches markdown links with calendly URLs: [text](https://calendly.com/...)
const MARKDOWN_CALENDLY_PATTERN = /\[([^\]]*)\]\((https?:\/\/calendly\.com\/[^\s)]+)\)/g
// Matches bare calendly URLs
const BARE_CALENDLY_PATTERN = /(https?:\/\/calendly\.com\/[^\s)]+)/g

function renderContent(content: string) {
  // First, replace markdown-formatted Calendly links with a placeholder
  const withoutMarkdownLinks = content.replace(MARKDOWN_CALENDLY_PATTERN, '{{CALENDLY:$2}}')
  // Then split on bare Calendly URLs too
  const normalized = withoutMarkdownLinks.replace(BARE_CALENDLY_PATTERN, '{{CALENDLY:$1}}')

  // Clean up any leftover punctuation around the placeholder
  const cleaned = normalized.replace(/[\s]*{{CALENDLY:/g, '{{CALENDLY:').replace(/}}[\s]*[.)]/g, '}}')

  if (!cleaned.includes('{{CALENDLY:')) return content

  const parts = cleaned.split(/\{\{CALENDLY:(.*?)\}\}/)

  return parts.map((part, i) => {
    // Odd indices are the captured URLs
    if (i % 2 === 1) {
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
    // Clean up any trailing/leading whitespace or orphaned punctuation
    const trimmed = part.replace(/^\s+|\s+$/g, '').replace(/^[).\s]+|[(\s]+$/g, '')
    if (!trimmed) return null
    return <span key={i}>{trimmed}</span>
  })
}

export function TypingIndicator() {
  return (
    <div className="flex w-full mb-3 justify-start">
      <div className="bg-neutral-100 text-neutral-900 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
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
