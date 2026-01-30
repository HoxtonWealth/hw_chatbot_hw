import { Source } from '@/lib/rag'
import { executeCompare } from './compare'
import { executeSummarize } from './summarize'
import { executeSources } from './sources'
import { executeExport } from './export'

export interface CommandResult {
  type: 'text' | 'table' | 'list' | 'action'
  content: string
  data?: unknown
}

export interface CommandContext {
  messages: Array<{ role: string; content: string }>
  sources: Source[]
  documentIds?: string[]
}

export interface ParsedCommand {
  command: string
  args: string[]
}

const BUILTIN_COMMANDS = ['compare', 'summarize', 'sources', 'export'] as const
export type BuiltinCommandName = (typeof BUILTIN_COMMANDS)[number]

// Keep backward compatibility
export const VALID_COMMANDS = BUILTIN_COMMANDS

/**
 * Checks whether the input string is a slash command (built-in or custom).
 */
export function isCommand(input: string, customCommandNames?: string[]): boolean {
  const trimmed = input.trim()
  if (!trimmed.startsWith('/')) return false
  const cmd = trimmed.slice(1).split(/\s+/)[0]?.toLowerCase()
  if (!cmd) return false
  if (BUILTIN_COMMANDS.includes(cmd as BuiltinCommandName)) return true
  if (customCommandNames?.includes(cmd)) return true
  return false
}

/**
 * Parses a slash command string into a command name and args array.
 * Returns null if the input doesn't start with /.
 * For custom commands, validation is deferred to execution.
 */
export function parseCommand(input: string, customCommandNames?: string[]): ParsedCommand | null {
  const trimmed = input.trim()
  if (!trimmed.startsWith('/')) return null

  const parts = trimmed.slice(1).split(/\s+/)
  const command = parts[0]?.toLowerCase()

  if (!command) return null

  // Accept built-in commands
  if (BUILTIN_COMMANDS.includes(command as BuiltinCommandName)) {
    return { command, args: parts.slice(1) }
  }

  // Accept known custom commands
  if (customCommandNames?.includes(command)) {
    return { command, args: parts.slice(1) }
  }

  return null
}

/**
 * Dispatches a parsed command to its handler and returns the result.
 * Falls through to custom command handler for non-built-in commands.
 */
export async function executeCommand(
  command: string,
  args: string[],
  context: CommandContext
): Promise<CommandResult> {
  switch (command as BuiltinCommandName) {
    case 'compare':
      return executeCompare(args, context)
    case 'summarize':
      return executeSummarize(args, context)
    case 'sources':
      return executeSources()
    case 'export':
      return executeExport(context)
    default:
      // Fall through to custom command handler via API
      return executeCustomCommandViaApi(command, args)
  }
}

/**
 * Executes a custom command via the server-side API.
 * This avoids importing server-only modules (supabaseAdmin) on the client.
 */
async function executeCustomCommandViaApi(
  command: string,
  args: string[]
): Promise<CommandResult> {
  try {
    const response = await fetch('/api/commands/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, args }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      return {
        type: 'text',
        content: data.error?.message || `Failed to execute command /${command}`,
      }
    }

    return {
      type: 'text',
      content: data.content || `Command /${command} completed with no output.`,
    }
  } catch {
    return {
      type: 'text',
      content: `Failed to execute command /${command}. Please try again.`,
    }
  }
}
