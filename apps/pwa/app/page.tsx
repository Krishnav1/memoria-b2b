import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Memoria
      </h1>
      <p className="text-gray-600 mb-8 text-center">
        Access your wedding memories
      </p>
      <div className="space-y-4 text-center">
        <p className="text-sm text-gray-500">
          Scan a QR code at your wedding to access photos
        </p>
        <Link
          href="/e/demo"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Demo Guest Access
        </Link>
      </div>
    </div>
  )
}