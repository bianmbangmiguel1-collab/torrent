// app/api/admin/newsletter/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

// DELETE - Supprimer une campagne
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const db = await getDB();

    // Vérifier si la campagne existe
    const campaign = await db.get(
      'SELECT id, status FROM newsletter_campaigns WHERE id = ?',
      [id]
    );

    if (!campaign) {
      return NextResponse.json({
        success: false,
        error: 'Campagne non trouvée'
      }, { status: 404 });
    }

    // 🔥 Supprimer les statistiques associées
    await db.run(
      'DELETE FROM newsletter_stats WHERE campaign_id = ?',
      [id]
    );

    // 🔥 Supprimer les enregistrements de newsletter_reads associés
    // (si la table existe et a une relation avec les messages)
    try {
      await db.run(
        'DELETE FROM newsletter_reads WHERE message_id IN (SELECT id FROM newsletter_messages WHERE campaign_id = ?)',
        [id]
      );
    } catch (e) {
      // La table n'existe pas ou n'a pas de relation
    }

    // 🔥 Supprimer les messages associés
    await db.run(
      'DELETE FROM newsletter_messages WHERE campaign_id = ?',
      [id]
    );

    // 🔥 Puis supprimer la campagne
    await db.run(
      'DELETE FROM newsletter_campaigns WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Campagne supprimée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression campagne:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la suppression de la campagne: ' + String(error)
    }, { status: 500 });
  }
}