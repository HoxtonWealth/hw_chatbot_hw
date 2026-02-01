'use client'

import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RETRIEVAL_CONFIG } from '@/lib/retrieval/config'

interface ConfidenceIndicatorProps {
  confidence: number
  sourcesCount: number
}

export function ConfidenceIndicator({ confidence, sourcesCount }: ConfidenceIndicatorProps) {
  const getConfidenceLevel = () => {
    if (confidence >= RETRIEVAL_CONFIG.confidenceLevels.high) return 'high'
    if (confidence >= RETRIEVAL_CONFIG.confidenceLevels.medium) return 'medium'
    return 'low'
  }

  const level = getConfidenceLevel()

  const config = {
    high: {
      icon: CheckCircle,
      label: 'High confidence',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    medium: {
      icon: AlertTriangle,
      label: 'Medium confidence',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    },
    low: {
      icon: AlertCircle,
      label: 'Low confidence',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  }

  const { icon: Icon, label, color, bgColor, borderColor } = config[level]

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
        bgColor,
        borderColor
      )}
    >
      <Icon className={cn('h-4 w-4', color)} />
      <span className={color}>{label}</span>
      <span className="text-muted-foreground">•</span>
      <span className="text-muted-foreground">
        {confidence}% based on {sourcesCount} source{sourcesCount !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
