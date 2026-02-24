import type { Metadata } from 'next'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Knowledge Base Chat Widget',
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-transparent m-0 p-0 overflow-hidden h-screen flex items-end justify-end sm:p-4">
        {children}
      </body>
    </html>
  )
}
