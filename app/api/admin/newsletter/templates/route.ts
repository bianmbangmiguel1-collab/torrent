export const dynamic = 'force-dynamic';

// app/api/admin/newsletter/templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

// ============================================================
// Types
// ============================================================
interface NewsletterTemplateRow {
  id: number;
  name: string;
  subject: string;
  content: string;
  type: string;
  category: string;
  variables: string | null;
  created_at?: string;
  updated_at?: string;
}

interface NewsletterTemplateBody {
  name?: string;
  subject?: string;
  content?: string;
  type?: string;
  category?: string;
  variables?: unknown;
}

interface DbRunResult {
  lastID?: number;
  changes?: number;
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all';

    let query = 'SELECT * FROM newsletter_templates WHERE 1=1';
    const params: any[] = [];

    if (type !== 'all') {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const templates = (await db.all(query, params)) as NewsletterTemplateRow[];

    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error('Erreur templates:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as NewsletterTemplateBody;
    const { name, subject, content, type, category, variables } = body;

    if (!name || !subject || !content) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    const db = await getDB();
    const result = (await db.run(
      `INSERT INTO newsletter_templates (name, subject, content, type, category, variables, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [name, subject, content, type || 'both', category || 'general', JSON.stringify(variables || [])]
    )) as DbRunResult;

    return NextResponse.json({ 
      success: true, 
      template: { id: result.lastID, name, subject, content, type, category, variables }
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur création template:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const db = await getDB();
    await db.run('DELETE FROM newsletter_templates WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression template:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}