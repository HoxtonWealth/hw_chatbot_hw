'use client'

import { useState, useCallback } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { Upload, FileText, X, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { toast } from '@/components/ui/sonner'

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

const MAX_SIZE = 50 * 1024 * 1024 // 50MB

interface UploadingFile {
  file: File
  progress: number
  status: 'uploading' | 'complete' | 'error'
  error?: string
}

interface DuplicateInfo {
  file: File
  existingId: string
}

export function FileUploader() {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [duplicateDialog, setDuplicateDialog] = useState<DuplicateInfo | null>(null)

  const uploadFile = useCallback(async (file: File, replace: boolean = false) => {
    setUploadingFiles(prev => [...prev, { file, progress: 0, status: 'uploading' }])
    setErrors([])

    const formData = new FormData()
    formData.append('file', file)
    if (replace) {
      formData.append('replace', 'true')
    }

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error?.code === 'E102' && data.existingId) {
          // Duplicate file detected
          setDuplicateDialog({ file, existingId: data.existingId })
          setUploadingFiles(prev => prev.filter(f => f.file !== file))
          return
        }
        throw new Error(data.error?.message || 'Upload failed')
      }

      setUploadingFiles(prev =>
        prev.map(f =>
          f.file === file ? { ...f, progress: 100, status: 'complete' } : f
        )
      )
      toast.success(`${file.name} uploaded successfully`)

      // Remove completed file after 2 seconds
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.file !== file))
      }, 2000)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      setUploadingFiles(prev =>
        prev.map(f =>
          f.file === file ? { ...f, status: 'error', error: message } : f
        )
      )
      setErrors(prev => [...prev, `${file.name}: ${message}`])
    }
  }, [])

  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      await uploadFile(file)
    }
  }, [uploadFile])

  const handleRejected = useCallback((rejections: FileRejection[]) => {
    const newErrors = rejections.map(rejection => {
      const { file, errors } = rejection
      const errorMessages = errors.map(e => {
        if (e.code === 'file-too-large') {
          return 'File exceeds 50MB limit'
        }
        if (e.code === 'file-invalid-type') {
          return 'Invalid file type. Accepted: PDF, TXT, DOCX, MD'
        }
        return e.message
      })
      return `${file.name}: ${errorMessages.join(', ')}`
    })
    setErrors(newErrors)
  }, [])

  const handleReplace = useCallback(() => {
    if (duplicateDialog) {
      uploadFile(duplicateDialog.file, true)
      setDuplicateDialog(null)
    }
  }, [duplicateDialog, uploadFile])

  const removeFile = useCallback((file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    onDrop: handleDrop,
    onDropRejected: handleRejected,
  })

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`p-8 border-2 border-dashed cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className={`p-4 rounded-full ${isDragActive ? 'bg-primary/10' : 'bg-muted'}`}>
            <Upload className={`h-8 w-8 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="text-lg font-medium">
              {isDragActive ? 'Drop files here' : 'Drag and drop files'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            PDF, TXT, DOCX, MD up to 50MB
          </p>
        </div>
      </Card>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uploadingFile, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-4">
                <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadingFile.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadingFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {uploadingFile.status === 'uploading' && (
                    <Progress value={uploadingFile.progress} className="mt-2 h-1" />
                  )}
                  {uploadingFile.status === 'error' && (
                    <p className="text-xs text-destructive mt-1">{uploadingFile.error}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(uploadingFile.file)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!duplicateDialog} onOpenChange={() => setDuplicateDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate File Detected</AlertDialogTitle>
            <AlertDialogDescription>
              A file named &quot;{duplicateDialog?.file.name}&quot; already exists in the knowledge base.
              Would you like to replace it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReplace}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
