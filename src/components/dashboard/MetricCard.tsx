'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FileText, Layers, Clock, AlertCircle, Search, Calendar, Timer, Target } from 'lucide-react'

const ICONS = {
  file: FileText,
  layers: Layers,
  clock: Clock,
  alert: AlertCircle,
  search: Search,
  calendar: Calendar,
  timer: Timer,
  target: Target,
} as const

interface MetricCardProps {
  title: string
  value: string | number
  icon: keyof typeof ICONS
  variant?: 'default' | 'warning' | 'destructive'
  loading?: boolean
}

export function MetricCard({ title, value, icon, variant = 'default', loading }: MetricCardProps) {
  const Icon = ICONS[icon]

  return (
    <Card className={cn(
      variant === 'warning' && 'border-yellow-500',
      variant === 'destructive' && 'border-red-500'
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-20 bg-muted animate-pulse rounded" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  )
}
