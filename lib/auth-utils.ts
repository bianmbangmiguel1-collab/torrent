// lib/auth-utils.ts
import { NextRequest } from 'next/server'

export function getTokenFromRequest(request: NextRequest): string | null {
  // 1. Essayer dans le header Authorization
  let token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (token) return token
  
  // 2. Essayer dans le cookie 'token'
  token = request.cookies.get('token')?.value
  if (token) return token
  
  // 3. Essayer dans le cookie 'auth_token'
  token = request.cookies.get('auth_token')?.value
  if (token) return token
  
  return null
}

export function verifyTokenSimple(token: string): any | null {
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      return payload
    }
    return null
  } catch {
    return null
  }
}