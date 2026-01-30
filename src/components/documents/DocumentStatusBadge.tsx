'use client'

import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface DocumentStatusBadgeProps {
  status: string
}

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="secondary">Queued</Badge>
      )
    case 'processing':
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      )
    case 'completed':
      return (
        <Badge variant="success">Ready</Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive">Failed</Badge>
      )
    case 'partial':
      return (
        <Badge variant="warning">Partial</Badge>
      )
    default:
      return (
        <Badge variant="outline">{status}</Badge>
      )
  }
}
