import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq, and, sql, asc, desc } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || '20'), 100) || 20;

    // Get aggregated bids (buy orders), sorted by price descending
    const bids = await db.execute(sql`
      SELECT price, SUM(remaining::numeric) as quantity
      FROM orders
      WHERE symbol = ${symbol}
        AND side = 'buy'
        AND status IN ('new', 'partially_filled')
        AND remaining::numeric > 0
      GROUP BY price
      ORDER BY price::numeric DESC
      LIMIT ${limit}
    `);

    // Get aggregated asks (sell orders), sorted by price ascending
    const asks = await db.execute(sql`
      SELECT price, SUM(remaining::numeric) as quantity
      FROM orders
      WHERE symbol = ${symbol}
        AND side = 'sell'
        AND status IN ('new', 'partially_filled')
        AND remaining::numeric > 0
      GROUP BY price
      ORDER BY price::numeric ASC
      LIMIT ${limit}
    `);

    return NextResponse.json({
      success: true,
      data: {
        bids: bids.map((b: any) => [b.price, Number(b.quantity).toFixed(8)]),
        asks: asks.map((a: any) => [a.price, Number(a.quantity).toFixed(8)]),
      },
    });
  } catch (error: any) {
    console.error('Depth error:', error?.message);
    return NextResponse.json({ success: false, error: 'Failed to fetch depth' }, { status: 500 });
  }
}
