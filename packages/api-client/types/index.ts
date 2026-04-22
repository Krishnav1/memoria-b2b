// Only re-export browser client for browser usage
// Server client (createServerClient) is for server-side only
export { createClient as createBrowserClient } from '../lib/browser'
export type { Database } from './database'
export type { DatabaseTypes } from './database.types'
