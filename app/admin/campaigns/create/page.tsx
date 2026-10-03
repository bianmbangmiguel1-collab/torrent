// app/admin/campaigns/create/page.tsx
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CampaignEditor from '../CampaignEditor'; // ← correction : import relatif
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Nouvelle campagne - TorrentTwist Admin',
  description: 'Créez une nouvelle campagne publicitaire ou promotionnelle',
};

export default async function CreateCampaignPage() {
  // Vérification de l'authentification (optionnel)
  // const session = await getServerSession(authOptions);
  // if (!session || (session.user as any)?.role !== 'admin') {
  //   redirect('/admin/login');
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      <CampaignEditor isNew={true} />
    </div>
  );
}