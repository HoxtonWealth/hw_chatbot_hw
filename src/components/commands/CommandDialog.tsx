'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CustomCommand } from '@/lib/supabase'

interface CommandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  command: CustomCommand | null
  onSave: (data: Partial<CustomCommand>) => Promise<boolean>
}

export function CommandDialog({ open, onOpenChange, command, onSave }: CommandDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [usageHint, setUsageHint] = useState('')
  const [promptTemplate, setPromptTemplate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!command
  const isBuiltin = command?.is_builtin ?? false

  useEffect(() => {
    if (command) {
      setName(command.name)
      setDescription(command.description)
      setUsageHint(command.usage_hint || '')
      setPromptTemplate(command.prompt_template || '')
    } else {
      setName('')
      setDescription('')
      setUsageHint('')
      setPromptTemplate('')
    }
    setError(null)
  }, [command, open])

  const handleSubmit = async () => {
    setError(null)

    if (!description.trim()) {
      setError('Description is required')
      return
    }

    if (!isBuiltin) {
      if (!name.trim()) {
        setError('Name is required')
        return
      }
      const nameRegex = /^[a-z0-9][a-z0-9-]{0,19}$/
      if (!nameRegex.test(name)) {
        setError('Name must be lowercase alphanumeric + hyphens, max 20 chars, starting with a letter or number')
        return
      }
      if (!promptTemplate.trim()) {
        setError('Prompt template is required')
        return
      }
    }

    setSaving(true)
    try {
      const data: Partial<CustomCommand> = { description }
      if (!isBuiltin) {
        data.name = name
        data.usage_hint = usageHint || undefined
        data.prompt_template = promptTemplate
      }

      const success = await onSave(data)
      if (success) {
        onOpenChange(false)
      }
    } catch {
      setError('Failed to save command')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? (isBuiltin ? 'Edit Built-in Command' : 'Edit Command') : 'New Command'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase())}
              placeholder="my-command"
              disabled={isBuiltin}
            />
            {!isBuiltin && (
              <p className="text-xs text-muted-foreground">
                Lowercase alphanumeric + hyphens, max 20 chars
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this command do?"
            />
          </div>

          {!isBuiltin && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Usage Hint</label>
                <Input
                  value={usageHint}
                  onChange={(e) => setUsageHint(e.target.value)}
                  placeholder="/my-command [argument]"
                />
                <p className="text-xs text-muted-foreground">
                  Shows users how to use the command
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Prompt Template</label>
                <Textarea
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  placeholder={"Given the following context:\n\n{{context}}\n\nPlease answer:\n{{query}}"}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">{'{{query}}'}</code> for user input and{' '}
                  <code className="bg-muted px-1 rounded">{'{{context}}'}</code> for retrieved document chunks
                </p>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Command'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
