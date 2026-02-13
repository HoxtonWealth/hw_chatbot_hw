'use client'

import { cn } from '@/lib/utils'

interface EmbedMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
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
        {content}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-neutral-400 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  )
}
