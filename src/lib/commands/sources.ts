import { CommandResult } from './index'

interface DocumentInfo {
  id: string
  title: string
  source_type: string
  status: string
  chunk_count: number
  created_at: string
  file_name?: string
}

/**
 * Handles /sources command.
 * Fetches the list of documents from the API and returns a formatted list.
 * No LLM call is involved.
 */
export async function executeSources(): Promise<CommandResult> {
  try {
    const response = await fetch('/api/documents')

    if (!response.ok) {
      throw new Error('Failed to fetch documents')
    }

    const data = await response.json()

    if (!data.success || !data.documents?.length) {
      return {
        type: 'text',
        content: 'No documents found in the knowledge base. Upload some documents to get started.',
      }
    }

    const documents: DocumentInfo[] = data.documents

    const header = `**Knowledge Base Sources** (${documents.length} document${documents.length === 1 ? '' : 's'})\n\n`
    const tableHeader = '| # | Document | Type | Status | Chunks | Added |\n|---|----------|------|--------|--------|-------|\n'
    const rows = documents
      .map((doc, i) => {
        const date = new Date(doc.created_at).toLocaleDateString()
        const name = doc.title || doc.file_name || 'Untitled'
        const statusIcon = getStatusIcon(doc.status)
        return `| ${i + 1} | ${name} | ${doc.source_type} | ${statusIcon} ${doc.status} | ${doc.chunk_count} | ${date} |`
      })
      .join('\n')

    return {
      type: 'list',
      content: header + tableHeader + rows,
      data: documents,
    }
  } catch (error) {
    return {
      type: 'text',
      content: `Error fetching sources: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed':
      return '✅'
    case 'processing':
      return '⏳'
    case 'pending':
      return '🕐'
    case 'failed':
      return '❌'
    case 'partial':
      return '⚠️'
    default:
      return '❓'
  }
}
