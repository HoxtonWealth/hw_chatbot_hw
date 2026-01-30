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
import { Badge } from '@/components/ui/badge'
import { CommandDialog } from './CommandDialog'
import { Pencil, Trash2, Lock, Plus } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { CustomCommand } from '@/lib/supabase'

interface CommandTableProps {
  commands: CustomCommand[]
}

export function CommandTable({ commands }: CommandTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editCommand, setEditCommand] = useState<CustomCommand | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/commands/${deleteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Command deleted successfully')
        router.refresh()
      } else {
        const data = await response.json()
        toast.error(data.error?.message || 'Failed to delete command')
      }
    } catch {
      toast.error('Failed to delete command')
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const handleSave = async (data: Partial<CustomCommand>): Promise<boolean> => {
    const isEdit = !!editCommand

    try {
      const url = isEdit ? `/api/commands/${editCommand.id}` : '/api/commands'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success(isEdit ? 'Command updated successfully' : 'Command created successfully')
        router.refresh()
        return true
      } else {
        toast.error(result.error?.message || `Failed to ${isEdit ? 'update' : 'create'} command`)
        return false
      }
    } catch {
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} command`)
      return false
    }
  }

  const openCreate = () => {
    setEditCommand(null)
    setIsCreating(true)
    setDialogOpen(true)
  }

  const openEdit = (command: CustomCommand) => {
    setEditCommand(command)
    setIsCreating(false)
    setDialogOpen(true)
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Command
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Command</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commands.map((cmd) => (
            <TableRow key={cmd.id}>
              <TableCell className="font-mono font-medium">
                /{cmd.name}
              </TableCell>
              <TableCell>
                <span className="truncate max-w-[300px] block" title={cmd.description}>
                  {cmd.description}
                </span>
              </TableCell>
              <TableCell>
                {cmd.is_builtin ? (
                  <Badge variant="secondary">
                    <Lock className="h-3 w-3 mr-1" />
                    Built-in
                  </Badge>
                ) : (
                  <Badge variant="outline">Custom</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(cmd)}
                    aria-label={`Edit ${cmd.name}`}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  {!cmd.is_builtin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(cmd.id)}
                      aria-label={`Delete ${cmd.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CommandDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        command={isCreating ? null : editCommand}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Command</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this command? This action cannot be undone.
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
