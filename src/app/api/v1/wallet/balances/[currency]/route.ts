import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wallets } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ currency: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { currency } = await params;
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.userId, auth.userId), eq(wallets.currency, currency.toUpperCase())))
      .limit(1);

    if (!wallet) {
      return NextResponse.json({
        success: true,
        data: {
          currency: currency.toUpperCase(),
          available: '0.00000000',
          frozen: '0.00000000',
          total: '0.00000000',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        currency: wallet.currency,
        available: wallet.available,
        frozen: wallet.frozen,
        total: (Number(wallet.available) + Number(wallet.frozen)).toFixed(8),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
