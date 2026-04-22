import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4">
      <Link href="/" className="mb-8 text-2xl font-bold text-gray-900">
        Memoria Studio
      </Link>
      {children}
    </div>
  )
}