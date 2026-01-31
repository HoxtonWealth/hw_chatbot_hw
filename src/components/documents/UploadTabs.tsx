'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileUploader } from '@/components/documents/FileUploader'
import { TextInput } from '@/components/documents/TextInput'
import { Upload, Type } from 'lucide-react'

export function UploadTabs() {
  return (
    <Tabs defaultValue="file" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="file" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Files
        </TabsTrigger>
        <TabsTrigger value="text" className="gap-2">
          <Type className="h-4 w-4" />
          Paste Text
        </TabsTrigger>
      </TabsList>
      <TabsContent value="file" className="mt-4">
        <FileUploader />
      </TabsContent>
      <TabsContent value="text" className="mt-4">
        <TextInput />
      </TabsContent>
    </Tabs>
  )
}
