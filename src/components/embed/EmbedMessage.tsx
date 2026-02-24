'use client'

import { Calendar, MessageSquare } from 'lucide-react'

interface EmbedMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  timestamp?: string
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
          className="flex items-center gap-2 mt-3 mb-1 px-4 py-2.5 bg-[#1B3B36] text-white text-sm font-medium rounded-lg hover:bg-[#1B3B36]/90 transition-colors w-fit no-underline"
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

function ChatIcon() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#1B3B36] flex items-center justify-center shrink-0">
      <MessageSquare className="h-4 w-4 text-white fill-white" />
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 mb-4">
      <ChatIcon />
      <div className="bg-white border border-neutral-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}

export function EmbedMessage({ role, content, isStreaming, timestamp }: EmbedMessageProps) {
  if (role === 'assistant') {
    return (
      <div className="flex items-start gap-2.5 mb-4">
        <ChatIcon />
        <div className="min-w-0 max-w-[calc(100%-44px)]">
          <div className="bg-white border border-neutral-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed text-neutral-900 shadow-sm whitespace-pre-wrap">
            {renderContent(content)}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-neutral-400 animate-pulse rounded-sm" />
            )}
          </div>
          {timestamp && (
            <span className="text-[11px] text-neutral-400 mt-1.5 block px-1">{timestamp}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[85%]">
        <div className="bg-[#1B3B36] text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed">
          {content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-white/50 animate-pulse rounded-sm" />
          )}
        </div>
        {timestamp && (
          <span className="text-[11px] text-neutral-400 mt-1.5 block text-right px-1">{timestamp}</span>
        )}
      </div>
    </div>
  )
}
