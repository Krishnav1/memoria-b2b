import { describe, it, expect } from 'vitest'

// Phone validation helper used in the auth pages
const isValidPhone = (phone: string): boolean => {
  return phone.replace(/\D/g, '').length === 10
}

const formatPhone = (phone: string): string => {
  return '+91' + phone.replace(/\D/g, '')
}

describe('Phone Validation', () => {
  describe('isValidPhone', () => {
    it('returns true for exactly 10 digits', () => {
      expect(isValidPhone('9876543210')).toBe(true)
    })

    it('returns true for 10 digits with formatting characters', () => {
      expect(isValidPhone('9876-543-210')).toBe(true)
      expect(isValidPhone('9876 543 210')).toBe(true)
    })

    it('returns false for fewer than 10 digits', () => {
      expect(isValidPhone('987654321')).toBe(false)
      expect(isValidPhone('98765432')).toBe(false)
      expect(isValidPhone('123')).toBe(false)
    })

    it('returns false for more than 10 digits', () => {
      expect(isValidPhone('98765432101')).toBe(false)
      expect(isValidPhone('987654321012')).toBe(false)
    })
  })

  describe('formatPhone', () => {
    it('formats 10-digit phone with India country code', () => {
      expect(formatPhone('9876543210')).toBe('+919876543210')
    })

    it('strips non-digits before formatting', () => {
      expect(formatPhone('9876-543-210')).toBe('+919876543210')
      expect(formatPhone('9876 543 210')).toBe('+919876543210')
    })
  })
})

describe('Slug Generation', () => {
  // Slug generation logic from signup page
  const generateSlug = (name: string): string => {
    const cleaned = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    const uuidPart = crypto.randomUUID().split('-')[0]
    return `${cleaned}-${uuidPart}`
  }

  it('converts studio name to lowercase slug', () => {
    const slug = generateSlug('John Studio')
    expect(slug).toMatch(/^john-studio-/)
  })

  it('replaces spaces with hyphens', () => {
    const slug = generateSlug('John Studio Photo')
    expect(slug).toBe('john-studio-photo-' + crypto.randomUUID().split('-')[0])
  })

  it('removes special characters', () => {
    const slug = generateSlug("John's Studio #1!")
    expect(slug).toMatch(/^johns-studio-1-/)
  })

  it('generates unique slug each time', () => {
    const slug1 = generateSlug('Test Studio')
    const slug2 = generateSlug('Test Studio')
    // UUIDs should be different
    expect(slug1).not.toBe(slug2)
  })
})