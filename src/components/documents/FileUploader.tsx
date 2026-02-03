'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { Upload, FileText, X, AlertCircle, FolderOpen, Check, AlertTriangle } from 'lucide-react'
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

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
}

const ACCEPTED_EXTENSIONS = new Set(['.pdf', '.txt', '.md', '.csv', '.docx', '.xlsx', '.xls'])

const MAX_SIZE = 50 * 1024 * 1024 // 50MB

// Folders to auto-exclude during folder scan
const EXCLUDED_FOLDERS = new Set([
  '.git', '.svn', '.hg',
  'node_modules', '__pycache__', '.next', '.nuxt',
  '.DS_Store', 'Thumbs.db',
  '.idea', '.vscode', '.vs',
  'dist', 'build', 'out',
  '.cache', '.tmp', '.temp',
])

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

interface ScannedFile {
  file: File
  relativePath: string
  reason?: string // rejection reason
}

interface FolderScanResult {
  accepted: ScannedFile[]
  rejected: ScannedFile[]
  folderName: string
}

function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  if (dot === -1) return ''
  return filename.slice(dot).toLowerCase()
}

function getRejectionReason(file: File): string {
  const ext = getFileExtension(file.name)
  if (!ext) return 'No file extension'
  if (!ACCEPTED_EXTENSIONS.has(ext)) return `Unsupported file type (${ext})`
  if (file.size > MAX_SIZE) return `Exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`
  if (file.size === 0) return 'Empty file'
  return 'Unknown reason'
}

function isAcceptedFile(file: File): boolean {
  const ext = getFileExtension(file.name)
  return ACCEPTED_EXTENSIONS.has(ext) && file.size <= MAX_SIZE && file.size > 0
}

function isExcludedPath(relativePath: string): boolean {
  const parts = relativePath.split('/')
  return parts.some(part => EXCLUDED_FOLDERS.has(part) || part.startsWith('.'))
}

function isFolderUploadSupported(): boolean {
  if (typeof document === 'undefined') return false
  const input = document.createElement('input')
  return 'webkitdirectory' in input
}

export function FileUploader() {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [duplicateDialog, setDuplicateDialog] = useState<DuplicateInfo | null>(null)
  const [folderScan, setFolderScan] = useState<FolderScanResult | null>(null)
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File, replace: boolean = false) => {
    setUploadingFiles(prev => [...prev, { file, progress: 0, status: 'uploading' }])

    try {
      // Step 1: Get a signed upload URL from our API
      const params = new URLSearchParams({
        fileName: file.name,
        fileType: file.type,
        fileSize: String(file.size),
      })
      const signedRes = await fetch(`/api/ingest?${params}`)
      const signedData = await signedRes.json()

      if (!signedRes.ok) {
        throw new Error(signedData.error?.message || 'Failed to get upload URL')
      }

      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? { ...f, progress: 30 } : f)
      )

      // Step 2: Upload directly to Supabase Storage (bypasses Vercel size limit)
      const uploadRes = await fetch(signedData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage')
      }

      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? { ...f, progress: 70 } : f)
      )

      // Step 3: Register file with our API (small JSON payload)
      const registerRes = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storagePath: signedData.path,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          replace,
        }),
      })

      const registerData = await registerRes.json()

      if (!registerRes.ok) {
        if (registerData.error?.code === 'E102' && registerData.existingId) {
          setDuplicateDialog({ file, existingId: registerData.existingId })
          setUploadingFiles(prev => prev.filter(f => f.file !== file))
          return
        }
        throw new Error(registerData.error?.message || 'Upload failed')
      }

      setUploadingFiles(prev =>
        prev.map(f =>
          f.file === file ? { ...f, progress: 100, status: 'complete' } : f
        )
      )
      toast.success(`${file.name} uploaded successfully`)

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
    setErrors([])
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
          return 'Invalid file type. Accepted: PDF, TXT, DOCX, MD, XLSX, XLS, CSV'
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

  // Folder upload handling
  const handleFolderSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setErrors([])
    const accepted: ScannedFile[] = []
    const rejected: ScannedFile[] = []

    // Determine the top-level folder name
    const firstPath = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath || files[0].name
    const folderName = firstPath.split('/')[0] || 'Selected folder'

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name

      // Skip excluded folders/hidden files
      if (isExcludedPath(relativePath)) {
        continue // Silently skip system/hidden folders
      }

      if (isAcceptedFile(file)) {
        accepted.push({ file, relativePath })
      } else {
        rejected.push({
          file,
          relativePath,
          reason: getRejectionReason(file),
        })
      }
    }

    setFolderScan({ accepted, rejected, folderName })

    // Reset the input so the same folder can be re-selected
    if (folderInputRef.current) {
      folderInputRef.current.value = ''
    }
  }, [])

  const handleFolderUploadConfirm = useCallback(async () => {
    if (!folderScan || folderScan.accepted.length === 0) return

    const filesToUpload = folderScan.accepted
    setFolderScan(null)
    setErrors([])
    setBatchProgress({ current: 0, total: filesToUpload.length })

    // Upload with concurrency limit of 3
    const concurrency = 3
    let completed = 0

    const uploadNext = async (index: number) => {
      if (index >= filesToUpload.length) return

      const { file } = filesToUpload[index]
      setUploadingFiles(prev => [...prev, { file, progress: 0, status: 'uploading' }])

      try {
        // Step 1: Get signed upload URL
        const params = new URLSearchParams({
          fileName: file.name,
          fileType: file.type,
          fileSize: String(file.size),
        })
        const signedRes = await fetch(`/api/ingest?${params}`)
        const signedData = await signedRes.json()

        if (!signedRes.ok) {
          throw new Error(signedData.error?.message || 'Failed to get upload URL')
        }

        setUploadingFiles(prev =>
          prev.map(f => f.file === file ? { ...f, progress: 30 } : f)
        )

        // Step 2: Upload directly to Supabase Storage
        const uploadRes = await fetch(signedData.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })

        if (!uploadRes.ok) {
          throw new Error('Failed to upload file to storage')
        }

        setUploadingFiles(prev =>
          prev.map(f => f.file === file ? { ...f, progress: 70 } : f)
        )

        // Step 3: Register with API
        const registerRes = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storagePath: signedData.path,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          }),
        })

        const registerData = await registerRes.json()

        if (!registerRes.ok) {
          throw new Error(registerData.error?.message || 'Upload failed')
        }

        setUploadingFiles(prev =>
          prev.map(f =>
            f.file === file ? { ...f, progress: 100, status: 'complete' } : f
          )
        )

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
      }

      completed++
      setBatchProgress(prev => prev ? { ...prev, current: completed } : null)
    }

    // Process in batches
    const queue = [...Array(filesToUpload.length).keys()]
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        const index = queue.shift()
        if (index !== undefined) {
          await uploadNext(index)
        }
      }
    })

    await Promise.all(workers)

    setBatchProgress(null)
    toast.success(`Folder upload complete: ${completed} files processed`)
  }, [folderScan])

  const handleFolderUploadCancel = useCallback(() => {
    setFolderScan(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    onDrop: handleDrop,
    onDropRejected: handleRejected,
  })

  const folderSupported = isFolderUploadSupported()

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
            PDF, TXT, DOCX, MD, XLSX, CSV up to 50MB
          </p>
        </div>
      </Card>

      {/* Folder upload button */}
      <div className="flex items-center gap-3">
        <input
          ref={folderInputRef}
          type="file"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({ webkitdirectory: '', directory: '' } as any)}
          multiple
          className="hidden"
          onChange={handleFolderSelect}
        />
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => folderInputRef.current?.click()}
          disabled={!folderSupported || !!batchProgress}
        >
          <FolderOpen className="h-4 w-4" />
          Upload Folder
        </Button>
      </div>

      {!folderSupported && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Folder upload is not supported in your browser. Use Chrome, Edge, or Firefox for folder upload.
          </AlertDescription>
        </Alert>
      )}

      {/* Batch progress */}
      {batchProgress && (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading folder...</span>
              <span>{batchProgress.current} / {batchProgress.total}</span>
            </div>
            <Progress
              value={(batchProgress.current / batchProgress.total) * 100}
              className="h-2"
            />
          </div>
        </Card>
      )}

      {/* Folder scan results dialog */}
      <AlertDialog open={!!folderScan} onOpenChange={() => setFolderScan(null)}>
        <AlertDialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Folder Scan: {folderScan?.folderName}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {/* Accepted files */}
                {folderScan && folderScan.accepted.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground flex items-center gap-1.5 mb-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {folderScan.accepted.length} file{folderScan.accepted.length !== 1 ? 's' : ''} ready to upload
                    </p>
                    <div className="max-h-40 overflow-y-auto rounded border p-2 space-y-1">
                      {folderScan.accepted.map((f, i) => (
                        <p key={i} className="text-xs text-muted-foreground truncate" title={f.relativePath}>
                          {f.relativePath}
                          <span className="ml-1 text-muted-foreground/60">
                            ({(f.file.size / 1024).toFixed(0)}KB)
                          </span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejected files */}
                {folderScan && folderScan.rejected.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground flex items-center gap-1.5 mb-2">
                      <X className="h-4 w-4 text-red-500" />
                      {folderScan.rejected.length} file{folderScan.rejected.length !== 1 ? 's' : ''} rejected
                    </p>
                    <div className="max-h-40 overflow-y-auto rounded border p-2 space-y-1">
                      {folderScan.rejected.map((f, i) => (
                        <p key={i} className="text-xs truncate" title={f.relativePath}>
                          <span className="text-muted-foreground">{f.relativePath}</span>
                          <span className="text-destructive ml-1">— {f.reason}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty folder */}
                {folderScan && folderScan.accepted.length === 0 && folderScan.rejected.length === 0 && (
                  <p className="text-muted-foreground">No files found in this folder.</p>
                )}

                {folderScan && folderScan.accepted.length === 0 && folderScan.rejected.length > 0 && (
                  <p className="text-muted-foreground">
                    No supported files found. All files were rejected.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleFolderUploadCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFolderUploadConfirm}
              disabled={!folderScan || folderScan.accepted.length === 0}
            >
              Upload {folderScan?.accepted.length || 0} File{(folderScan?.accepted.length || 0) !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
