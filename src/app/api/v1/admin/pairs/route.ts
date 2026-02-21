import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tradingPairs } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const pairs = await db.select().from(tradingPairs);
    return NextResponse.json({ success: true, data: pairs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to fetch pairs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const [pair] = await db.insert(tradingPairs).values({
      symbol: body.symbol,
      baseCurrency: body.baseCurrency,
      quoteCurrency: body.quoteCurrency,
      status: body.status || 'active',
      makerFeeBps: body.makerFeeBps || 10,
      takerFeeBps: body.takerFeeBps || 10,
      minAmount: body.minAmount || '0.00001',
      minTotal: body.minTotal || '1',
    }).returning();

    return NextResponse.json({ success: true, data: pair });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to create pair' }, { status: 500 });
  }
}
