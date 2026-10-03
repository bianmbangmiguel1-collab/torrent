export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { getBanners } from '@/lib/admin-actions';
import { NextResponse } from 'next/server';

export async function GET() {
  const banners = await getBanners();
  return NextResponse.json(banners);
}