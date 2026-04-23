// Only re-export browser client for browser usage
// Server client (createServerClient) is for server-side only
export { createClient as createBrowserClient } from '../lib/browser'
export type { Json, Studio, User, Invitation, UserRole } from './database'
