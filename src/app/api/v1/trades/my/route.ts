import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trades } from '@/lib/db/schema';
import { eq, or, and, desc } from 'drizzle-orm';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  try {
    const userTrades = await db
      .select()
      .from(trades)
      .where(and(
        or(
          eq(trades.buyerUserId, auth.userId),
          eq(trades.sellerUserId, auth.userId)
        ),
        ...(symbol ? [eq(trades.symbol, symbol)] : []),
      ))
      .orderBy(desc(trades.createdAt))
      .limit(100);

    return NextResponse.json({
      success: true,
      data: userTrades,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch trades' }, { status: 500 });
  }
}
