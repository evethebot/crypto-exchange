import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trades } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || '50'), 200) || 50;

    const recentTrades = await db
      .select()
      .from(trades)
      .where(eq(trades.symbol, symbol))
      .orderBy(desc(trades.createdAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: recentTrades,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch trades' }, { status: 500 });
  }
}
