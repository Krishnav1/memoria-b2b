import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Memoria Studio
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Your wedding photo delivery dashboard
      </p>
      <div className="space-x-4">
        <Link
          href="/auth/login"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Login
        </Link>
        <Link
          href="/auth/signup"
          className="inline-flex items-center px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
        >
          Sign Up
        </Link>
      </div>
    </div>
  )
}