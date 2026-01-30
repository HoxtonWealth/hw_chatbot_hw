'use client'

import { FileText, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Upload documents to build your knowledge base. Supported formats: PDF, Word, Text, and Markdown.
      </p>
      <Button asChild>
        <Link href="/">
          <Upload className="h-4 w-4 mr-2" />
          Upload Documents
        </Link>
      </Button>
    </div>
  )
}
