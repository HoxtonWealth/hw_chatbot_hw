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

const VALID_COMMANDS = ['compare', 'summarize', 'sources', 'export'] as const
export type CommandName = (typeof VALID_COMMANDS)[number]

/**
 * Checks whether the input string is a slash command.
 */
export function isCommand(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed.startsWith('/')) return false
  const cmd = trimmed.slice(1).split(/\s+/)[0]?.toLowerCase()
  return VALID_COMMANDS.includes(cmd as CommandName)
}

/**
 * Parses a slash command string into a command name and args array.
 * Returns null if the input is not a valid command.
 */
export function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim()
  if (!trimmed.startsWith('/')) return null

  const parts = trimmed.slice(1).split(/\s+/)
  const command = parts[0]?.toLowerCase()

  if (!command || !VALID_COMMANDS.includes(command as CommandName)) {
    return null
  }

  return {
    command,
    args: parts.slice(1),
  }
}

/**
 * Dispatches a parsed command to its handler and returns the result.
 */
export async function executeCommand(
  command: string,
  args: string[],
  context: CommandContext
): Promise<CommandResult> {
  switch (command as CommandName) {
    case 'compare':
      return executeCompare(args, context)
    case 'summarize':
      return executeSummarize(args, context)
    case 'sources':
      return executeSources()
    case 'export':
      return executeExport(context)
    default:
      return {
        type: 'text',
        content: `Unknown command: /${command}. Available commands: ${VALID_COMMANDS.map(c => `/${c}`).join(', ')}`,
      }
  }
}
