// Database types - generated from Prisma schema
// Run `pnpm db:generate` after creating migrations

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Studios (photographer businesses)
export interface Studio {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  createdAt: Date
  updatedAt: Date
}

// Users (belong to studios)
export interface User {
  id: string
  email: string
  name: string | null
  password: string | null
  role: UserRole
  studioId: string
  studio: Studio
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
  studioId: string
  studio: Studio
  expiresAt: Date
  createdAt: Date
}
