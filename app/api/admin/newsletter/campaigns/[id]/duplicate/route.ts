// app/api/admin/newsletter/campaigns/[id]/duplicate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const db = await getDB();

    // Récupérer la campagne originale
    const campaign = await db.get(
      'SELECT * FROM newsletter_campaigns WHERE id = ?',
      [id]
    );

    if (!campaign) {
      return NextResponse.json({
        success: false,
        error: 'Campagne non trouvée'
      }, { status: 404 });
    }

    // Créer une copie
    const newName = `${campaign.name} (copie)`;
    const result = await db.run(`
      INSERT INTO newsletter_campaigns (
        name, 
        subject, 
        content, 
        template_id, 
        status, 
        segment, 
        created_by, 
        created_at, 
        updated_at
      ) VALUES (?, ?, ?, ?, 'draft', ?, ?, datetime('now'), datetime('now'))
    `, [
      newName,
      campaign.subject,
      campaign.content,
      campaign.template_id,
      campaign.segment,
      campaign.created_by
    ]);

    const newId = result.lastID;

    const newCampaign = await db.get(
      'SELECT * FROM newsletter_campaigns WHERE id = ?',
      [newId]
    );

    return NextResponse.json({
      success: true,
      campaign: newCampaign
    });

  } catch (error) {
    console.error('❌ Erreur duplication campagne:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la duplication de la campagne: ' + String(error)
    }, { status: 500 });
  }
}