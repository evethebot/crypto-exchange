import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trades, tradingPairs } from '@/lib/db/schema';
import { eq, and, sql, gte, lte, asc } from 'drizzle-orm';

const VALID_INTERVALS: Record<string, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval') || '1h';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);

    // Validate interval
    if (!VALID_INTERVALS[interval]) {
      return NextResponse.json(
        { success: false, error: `Invalid interval: ${interval}. Valid: ${Object.keys(VALID_INTERVALS).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate pair exists
    const [pair] = await db
      .select()
      .from(tradingPairs)
      .where(eq(tradingPairs.symbol, symbol))
      .limit(1);

    if (!pair) {
      return NextResponse.json(
        { success: false, error: 'Invalid trading pair' },
        { status: 404 }
      );
    }

    const intervalMs = VALID_INTERVALS[interval];

    // Get trades and aggregate into candles
    const allTrades = await db
      .select()
      .from(trades)
      .where(eq(trades.symbol, symbol))
      .orderBy(asc(trades.createdAt))
      .limit(10000);

    if (allTrades.length === 0) {
      // Return empty candles array
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Aggregate trades into candles
    const candles: any[] = [];
    const candleMap = new Map<number, {
      openTime: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
      tradeCount: number;
    }>();

    for (const trade of allTrades) {
      const tradeTime = new Date(trade.createdAt).getTime();
      const candleOpenTime = Math.floor(tradeTime / intervalMs) * intervalMs;
      const price = Number(trade.price);
      const amount = Number(trade.amount);

      const existing = candleMap.get(candleOpenTime);
      if (existing) {
        existing.high = Math.max(existing.high, price);
        existing.low = Math.min(existing.low, price);
        existing.close = price;
        existing.volume += amount;
        existing.tradeCount++;
      } else {
        candleMap.set(candleOpenTime, {
          openTime: candleOpenTime,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: amount,
          tradeCount: 1,
        });
      }
    }

    // Sort by openTime ascending and limit
    const sortedCandles = Array.from(candleMap.values())
      .sort((a, b) => a.openTime - b.openTime)
      .slice(-limit);

    // Format for response
    const formattedCandles = sortedCandles.map((c) => ({
      openTime: new Date(c.openTime).toISOString(),
      closeTime: new Date(c.openTime + intervalMs - 1).toISOString(),
      open: c.open.toString(),
      high: c.high.toString(),
      low: c.low.toString(),
      close: c.close.toString(),
      volume: c.volume.toString(),
      tradeCount: c.tradeCount,
    }));

    return NextResponse.json({
      success: true,
      data: formattedCandles,
    });
  } catch (error: any) {
    console.error('Candle API error:', error?.message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch candles' },
      { status: 500 }
    );
  }
}
