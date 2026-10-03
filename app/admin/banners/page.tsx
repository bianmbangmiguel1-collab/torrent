// app/admin/banners/page.tsx
import { getBanners } from '@/lib/admin-actions';
import { BannersClient } from './BannersClient';

export default async function BannersPage() {
  const banners = await getBanners();
  return <BannersClient initialBanners={banners} />;
}