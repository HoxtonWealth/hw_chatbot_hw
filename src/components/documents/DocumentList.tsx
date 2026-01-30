'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DocumentStatusBadge } from './DocumentStatusBadge'
import { Trash2, FileText } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { format } from 'date-fns'

interface Document {
  id: string
  title: string
  source_type: string
  status: string
  created_at: string
  chunk_count: number
  file_name?: string
}

interface DocumentListProps {
  documents: Document[]
}

export function DocumentList({ documents }: DocumentListProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/documents/${deleteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Document deleted successfully')
        router.refresh()
      } else {
        const data = await response.json()
        toast.error(data.error?.message || 'Failed to delete document')
      }
    } catch {
      toast.error('Failed to delete document')
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a')
  }

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'PDF'
      case 'docx':
        return 'Word'
      case 'text':
        return 'Text'
      case 'md':
        return 'Markdown'
      default:
        return type.toUpperCase()
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-right">Chunks</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[200px]">{doc.title}</span>
                </div>
              </TableCell>
              <TableCell>{getFileTypeLabel(doc.source_type)}</TableCell>
              <TableCell>
                <DocumentStatusBadge status={doc.status} />
              </TableCell>
              <TableCell>{formatDate(doc.created_at)}</TableCell>
              <TableCell className="text-right">{doc.chunk_count}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(doc.id)}
                  disabled={doc.status === 'processing'}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This will also delete
              all associated chunks and embeddings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
