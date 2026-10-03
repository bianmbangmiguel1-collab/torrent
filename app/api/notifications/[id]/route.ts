// app/api/notifications/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { deleteNotification, markAsRead } from '@/lib/notifications'

function getUserIdFromToken(request: NextRequest): number | null {
  try {
    const token = request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value
    if (!token) return null
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(decodeURIComponent(
      atob(base64).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    ))
    return payload?.id || payload?.userId || null
  } catch { return null }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = getUserIdFromToken(request)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const ok = await deleteNotification(userId, parseInt(params.id))
  return NextResponse.json({ success: ok })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = getUserIdFromToken(request)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const ok = await markAsRead(userId, parseInt(params.id))
  return NextResponse.json({ success: ok })
}