import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    success: true,
    data: [
      { level: 1, name: 'Regular', minVolume: '0', makerFeeBps: 10, takerFeeBps: 10 },
      { level: 2, name: 'VIP 1', minVolume: '10000', makerFeeBps: 8, takerFeeBps: 9 },
      { level: 3, name: 'VIP 2', minVolume: '50000', makerFeeBps: 6, takerFeeBps: 8 },
      { level: 4, name: 'VIP 3', minVolume: '100000', makerFeeBps: 4, takerFeeBps: 6 },
      { level: 5, name: 'VIP 4', minVolume: '500000', makerFeeBps: 2, takerFeeBps: 4 },
    ],
  });
}
