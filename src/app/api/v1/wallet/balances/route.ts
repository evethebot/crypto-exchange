import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wallets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const userWallets = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, auth.userId));

    return NextResponse.json({
      success: true,
      data: userWallets.map(w => ({
        currency: w.currency,
        available: w.available,
        frozen: w.frozen,
        total: (Number(w.available) + Number(w.frozen)).toFixed(8),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch balances' },
      { status: 500 }
    );
  }
}
