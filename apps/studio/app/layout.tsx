import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Memoria Studio',
  description: 'Wedding photo delivery platform for photographers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {children}
        </div>
      </body>
    </html>
  )
}