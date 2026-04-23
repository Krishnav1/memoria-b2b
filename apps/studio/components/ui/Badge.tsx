import React from 'react'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-gray-100 text-gray-700',
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}

// Convenience: map event status strings to badge variants
const STATUS_VARIANT_MAP: Record<string, BadgeVariant> = {
  draft: 'neutral',
  created: 'info',
  uploading: 'warning',
  uploaded: 'success',
  delivered: 'success',
  access_granted: 'info',
  delivery_failed: 'error',
  upload_incomplete: 'error',
}

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT_MAP[status] || 'neutral'
  const labels: Record<string, string> = {
    draft: 'Draft',
    created: 'Created',
    uploading: 'Uploading',
    uploaded: 'Uploaded',
    delivered: 'Delivered',
    access_granted: 'Access Granted',
    delivery_failed: 'Delivery Failed',
    upload_incomplete: 'Upload Incomplete',
  }
  return <Badge variant={variant}>{labels[status] || status}</Badge>
}