# Story 6.1: Slash Commands

Status: review

## Story

As a **user**,
I want **to use slash commands for special actions**,
so that **I can quickly compare, summarize, or export**.

## Acceptance Criteria

1. Command palette triggered by typing /
2. /compare [A] vs [B] generates comparison table
3. /summarize [topic] generates condensed overview
4. /sources [query] lists matching documents without answer
5. /export copies answer as markdown with citations

## Tasks / Subtasks

- [x] Task 1: Create CommandPalette component (AC: 1)
  - [x] Create `src/components/chat/CommandPalette.tsx`
  - [x] Use custom popover (no shadcn Command dependency issues)
  - [x] Show when input starts with /
  - [x] Filter commands as user types
  - [x] Arrow keys to navigate, Enter to select

- [x] Task 2: Implement /compare command (AC: 2)
  - [x] Create `src/lib/commands/compare.ts`
  - [x] Parse documents A and B from args
  - [x] Retrieve from both documents via chat API
  - [x] Generate comparison table via LLM
  - [x] Format as markdown table

- [x] Task 3: Implement /summarize command (AC: 3)
  - [x] Create `src/lib/commands/summarize.ts`
  - [x] Retrieve document or topic chunks via chat API
  - [x] Generate condensed overview

- [x] Task 4: Implement /sources command (AC: 4)
  - [x] Create `src/lib/commands/sources.ts`
  - [x] Search for matching documents
  - [x] Return document list without LLM call
  - [x] Include document stats (chunks, date)

- [x] Task 5: Implement /export command (AC: 5)
  - [x] Create `src/lib/commands/export.ts`
  - [x] Format conversation as markdown
  - [x] Include inline citations
  - [x] Copy to clipboard
  - [x] Fallback to showing markdown if clipboard fails

- [x] Task 6: Integrate commands with chat (AC: 1-5)
  - [x] Parse command from message input
  - [x] Route to appropriate handler
  - [x] Display command-specific output
  - [x] Handle invalid commands gracefully

## Dev Notes

### CommandPalette Component

```typescript
// src/components/chat/CommandPalette.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { GitCompare, FileText, FolderSearch, Download } from 'lucide-react'

interface SlashCommand {
  command: string
  label: string
  description: string
  usage: string
  icon: React.ReactNode
}

const COMMANDS: SlashCommand[] = [
  {
    command: '/compare',
    label: 'Compare',
    description: 'Compare information across documents',
    usage: '/compare [doc1] vs [doc2] [topic]',
    icon: <GitCompare className="h-4 w-4" />,
  },
  {
    command: '/summarize',
    label: 'Summarize',
    description: 'Get a summary of a document or topic',
    usage: '/summarize [doc-name or topic]',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    command: '/sources',
    label: 'Sources',
    description: 'List all available documents',
    usage: '/sources [optional search]',
    icon: <FolderSearch className="h-4 w-4" />,
  },
  {
    command: '/export',
    label: 'Export',
    description: 'Export conversation as markdown',
    usage: '/export',
    icon: <Download className="h-4 w-4" />,
  },
]

interface CommandPaletteProps {
  isOpen: boolean
  filter: string
  onSelect: (command: SlashCommand) => void
  onClose: () => void
  position: { x: number; y: number }
}

export function CommandPalette({
  isOpen,
  filter,
  onSelect,
  onClose,
  position,
}: CommandPaletteProps) {
  const filteredCommands = COMMANDS.filter(
    cmd => cmd.command.includes(filter) || cmd.label.toLowerCase().includes(filter)
  )

  if (!isOpen) return null

  return (
    <div
      className="absolute z-50 w-72 bg-popover border rounded-md shadow-md"
      style={{ bottom: position.y, left: position.x }}
    >
      <Command>
        <CommandList>
          <CommandEmpty>No commands found.</CommandEmpty>
          <CommandGroup heading="Commands">
            {filteredCommands.map((cmd) => (
              <CommandItem
                key={cmd.command}
                onSelect={() => onSelect(cmd)}
                className="flex items-center gap-2"
              >
                {cmd.icon}
                <div>
                  <p className="font-medium">{cmd.label}</p>
                  <p className="text-xs text-muted-foreground">{cmd.description}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  )
}
```

### Command Handlers

```typescript
// src/lib/commands/index.ts
import { compare } from './compare'
import { summarize } from './summarize'
import { sources } from './sources'
import { exportConversation } from './export'

export interface CommandResult {
  type: 'text' | 'table' | 'list' | 'action'
  content: string
  data?: any
}

export async function executeCommand(
  command: string,
  args: string[],
  context: ChatContext
): Promise<CommandResult> {
  switch (command) {
    case '/compare':
      return compare(args, context)
    case '/summarize':
      return summarize(args, context)
    case '/sources':
      return sources(args, context)
    case '/export':
      return exportConversation(context)
    default:
      return {
        type: 'text',
        content: `Unknown command: ${command}. Type / to see available commands.`,
      }
  }
}
```

### Compare Command

```typescript
// src/lib/commands/compare.ts
export async function compare(
  args: string[],
  context: ChatContext
): Promise<CommandResult> {
  // Parse "doc1 vs doc2 topic"
  const vsIndex = args.findIndex(a => a.toLowerCase() === 'vs')
  if (vsIndex === -1) {
    return {
      type: 'text',
      content: 'Usage: /compare [doc1] vs [doc2] [topic]',
    }
  }

  const doc1 = args.slice(0, vsIndex).join(' ')
  const doc2AndTopic = args.slice(vsIndex + 1)
  const doc2 = doc2AndTopic[0]
  const topic = doc2AndTopic.slice(1).join(' ') || 'all aspects'

  // Retrieve from both documents
  const [chunks1, chunks2] = await Promise.all([
    retrieveFromDocument(doc1, topic),
    retrieveFromDocument(doc2, topic),
  ])

  // Generate comparison via LLM
  const comparison = await generateComparison(doc1, doc2, topic, chunks1, chunks2)

  return {
    type: 'table',
    content: comparison,
    data: { doc1, doc2, topic },
  }
}
```

### Export Command

```typescript
// src/lib/commands/export.ts
export async function exportConversation(
  context: ChatContext
): Promise<CommandResult> {
  const markdown = context.messages
    .map(m => {
      const prefix = m.role === 'user' ? '**You:**' : '**Assistant:**'
      let text = `${prefix}\n\n${m.content}`

      // Add citations if present
      if (m.sources && m.sources.length > 0) {
        text += '\n\n**Sources:**\n'
        m.sources.forEach((s, i) => {
          text += `- [${i + 1}] ${s.documentTitle}`
          if (s.pageNumber) text += `, Page ${s.pageNumber}`
          text += '\n'
        })
      }

      return text
    })
    .join('\n\n---\n\n')

  // Copy to clipboard
  await navigator.clipboard.writeText(markdown)

  return {
    type: 'action',
    content: 'Conversation exported to clipboard as markdown!',
  }
}
```

### FRs Covered

- FR28: /compare command for document comparison
- FR29: /summarize command for condensed overviews
- FR30: /sources command for document listing
- FR31: /export command for markdown export

### References

- [Source: RAG-ENRICHED-SPECS.md#Slash-Commands-Specification]
- [Source: epics.md#Story-6.1]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List
- All 6 tasks completed and verified
- CommandPalette supports both built-in and custom commands (from Story 6-5)
- All 4 built-in commands implemented with streaming response support
- Export command includes clipboard fallback
- Sources command returns document table without LLM call
- TypeScript check and Next.js build pass clean

### File List
**Files:**
- `src/components/chat/CommandPalette.tsx` — Command palette UI with keyboard navigation
- `src/lib/commands/index.ts` — Command router, parser, and dispatcher
- `src/lib/commands/compare.ts` — /compare command handler
- `src/lib/commands/summarize.ts` — /summarize command handler
- `src/lib/commands/sources.ts` — /sources command handler
- `src/lib/commands/export.ts` — /export command handler
- `src/components/chat/ChatInterface.tsx` — Chat integration with command detection and palette
