'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Upload' },
  { href: '/documents', label: 'Documents' },
  { href: '/chat', label: 'Chat' },
  { href: '/glossary', label: 'Glossary' },
  { href: '/commands', label: 'Commands' },
  { href: '/dashboard', label: 'Dashboard' },
]

export function AppHeader() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hoxton Wealth's Chatbot</h1>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              asChild
              className={cn(
                pathname === item.href && 'bg-accent font-semibold'
              )}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
          <div className="ml-2 pl-2 border-l">
            <UserButton />
          </div>
        </nav>

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t px-4 py-2 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              asChild
              className={cn(
                'w-full justify-start',
                pathname === item.href && 'bg-accent font-semibold'
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
          <div className="px-3 py-2">
            <UserButton />
          </div>
        </nav>
      )}
    </header>
  )
}
