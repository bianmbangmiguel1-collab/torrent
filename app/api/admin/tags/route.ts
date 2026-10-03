export const dynamic = 'force-dynamic';

// app/api/admin/tags/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

interface CreateTagBody {
  name: string
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDB()
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    let query = 'SELECT name FROM tags ORDER BY name ASC'
    let params: any[] = []

    if (search) {
      query = 'SELECT name FROM tags WHERE name LIKE ? ORDER BY name ASC'
      params.push(`%${search}%`)
    }

    const tags = await db.all(query, params)

    return NextResponse.json({ 
      tags: tags.map(t => t.name) 
    })
  } catch (error) {
    console.error('❌ Erreur tags:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tags' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDB()
    const body = (await request.json()) as CreateTagBody
    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Le nom du tag est requis' },
        { status: 400 }
      )
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

    // Vérifier si le tag existe déjà
    const existing = await db.get('SELECT id FROM tags WHERE name = ?', [name])
    if (existing) {
      return NextResponse.json(
        { error: 'Ce tag existe déjà' },
        { status: 400 }
      )
    }

    const result = await db.run(
      'INSERT INTO tags (name, slug) VALUES (?, ?)',
      [name, slug]
    )

    return NextResponse.json({
      success: true,
      tag: { id: result.lastID, name, slug }
    }, { status: 201 })
  } catch (error) {
    console.error('❌ Erreur création tag:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du tag' },
      { status: 500 }
    )
  }
}