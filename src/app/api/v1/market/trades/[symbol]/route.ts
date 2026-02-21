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

    // Add computed fields: side (taker side) and timestamp
    const formattedTrades = recentTrades.map((trade) => ({
      ...trade,
      side: 'buy', // Taker side: in our engine, the taker is the one who matched against resting orders
      timestamp: trade.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: formattedTrades,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch trades' }, { status: 500 });
  }
}
