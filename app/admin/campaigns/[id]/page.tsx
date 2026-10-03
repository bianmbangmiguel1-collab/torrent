// app/admin/campaigns/[id]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CampaignEditor from '../CampaignEditor'; // ← chemin relatif
import { getCampaign } from '@/lib/admin-actions';

export const metadata: Metadata = {
  title: 'Modifier la campagne - TorrentTwist Admin',
  description: 'Modifiez une campagne publicitaire ou promotionnelle existante',
};

interface EditCampaignPageProps {
  params: {
    id: string;
  };
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  // Valider l'ID
  const campaignId = parseInt(params.id, 10);
  if (isNaN(campaignId) || campaignId <= 0) {
    notFound();
  }

  // Récupérer la campagne
  let campaign;
  try {
    campaign = await getCampaign(campaignId);
  } catch (error) {
    console.error('Erreur lors du chargement de la campagne:', error);
    notFound();
  }

  if (!campaign) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CampaignEditor campaignId={campaignId} isNew={false} />
    </div>
  );
}