// Database types - generated from Prisma schema
// Run `pnpm db:generate` after creating migrations

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Tenants (organizations/companies)
export interface Tenant {
  id: string
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
}

// Users (belong to tenants)
export interface User {
  id: string
  email: string
  name: string | null
  password: string
  role: UserRole
  tenantId: string
  tenant: Tenant
  createdAt: Date
  updatedAt: Date
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

// Invitations (pending user invitations)
export interface Invitation {
  id: string
  email: string
  role: UserRole
  token: string
  tenantId: string
  tenant: Tenant
  expiresAt: Date
  createdAt: Date
}