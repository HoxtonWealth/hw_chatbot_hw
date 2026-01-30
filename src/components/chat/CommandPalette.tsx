'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { GitCompare, FileText, FolderSearch, Download, Sparkles, type LucideIcon } from 'lucide-react'

interface CommandDefinition {
  name: string
  label: string
  description: string
  usage: string
  icon: LucideIcon
}

const BUILTIN_COMMANDS: CommandDefinition[] = [
  {
    name: 'compare',
    label: '/compare',
    description: 'Compare two documents on a topic',
    usage: '/compare [doc1] vs [doc2] [topic]',
    icon: GitCompare,
  },
  {
    name: 'summarize',
    label: '/summarize',
    description: 'Summarize a topic or document',
    usage: '/summarize [topic or document name]',
    icon: FileText,
  },
  {
    name: 'sources',
    label: '/sources',
    description: 'List all documents in the knowledge base',
    usage: '/sources',
    icon: FolderSearch,
  },
  {
    name: 'export',
    label: '/export',
    description: 'Export conversation to clipboard as Markdown',
    usage: '/export',
    icon: Download,
  },
]

// Keep backward compatibility
const COMMANDS = BUILTIN_COMMANDS

interface CommandPaletteProps {
  isOpen: boolean
  filter: string
  onSelect: (command: CommandDefinition) => void
  onClose: () => void
  customCommands?: Array<{
    name: string
    description: string
    usage_hint?: string
  }>
}

export function CommandPalette({ isOpen, filter, onSelect, onClose, customCommands }: CommandPaletteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const allCommands = useMemo(() => {
    const custom: CommandDefinition[] = (customCommands || []).map((c) => ({
      name: c.name,
      label: `/${c.name}`,
      description: c.description,
      usage: c.usage_hint || `/${c.name} [query]`,
      icon: Sparkles,
    }))
    return [...BUILTIN_COMMANDS, ...custom]
  }, [customCommands])

  const filtered = allCommands.filter((cmd) =>
    cmd.name.toLowerCase().startsWith(filter.toLowerCase())
  )

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [filter])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || filtered.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % filtered.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
          break
        case 'Enter':
          e.preventDefault()
          onSelect(filtered[selectedIndex])
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [isOpen, filtered, selectedIndex, onSelect, onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!isOpen || filtered.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
      <div className="bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground">
            Slash Commands
          </span>
        </div>
        <div className="py-1">
          {filtered.map((cmd, index) => {
            const Icon = cmd.icon
            const isSelected = index === selectedIndex
            return (
              <button
                key={cmd.name}
                className={`w-full flex items-start gap-3 px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => onSelect(cmd)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      {cmd.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cmd.description}
                  </p>
                  <p className="text-xs text-muted-foreground/60 font-mono mt-0.5">
                    {cmd.usage}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { COMMANDS }
export type { CommandDefinition }
