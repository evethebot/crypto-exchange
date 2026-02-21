import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tradingPairs, trades } from '@/lib/db/schema';
import { eq, and, gte, desc, asc, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const pairs = await db.select().from(tradingPairs).where(eq(tradingPairs.status, 'active'));

    const now = new Date();
    const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const tickers = await Promise.all(pairs.map(async (pair) => {
      const recentTrades = await db
        .select()
        .from(trades)
        .where(and(
          eq(trades.symbol, pair.symbol),
          gte(trades.createdAt, h24ago),
        ))
        .orderBy(desc(trades.createdAt))
        .limit(1000);

      const lastTrade = recentTrades[0];
      const firstTrade = recentTrades[recentTrades.length - 1];

      let high = '0';
      let low = '0';
      let volume = '0';

      if (recentTrades.length > 0) {
        high = Math.max(...recentTrades.map(t => Number(t.price))).toString();
        low = Math.min(...recentTrades.map(t => Number(t.price))).toString();
        volume = recentTrades.reduce((sum, t) => sum + Number(t.amount), 0).toString();
      }

      const lastPrice = lastTrade ? lastTrade.price : '0';
      const openPrice = firstTrade ? firstTrade.price : lastPrice;
      const priceChange = (Number(lastPrice) - Number(openPrice)).toString();
      const priceChangePercent = Number(openPrice) > 0
        ? ((Number(priceChange) / Number(openPrice)) * 100).toFixed(2)
        : '0';

      return {
        symbol: pair.symbol,
        lastPrice,
        priceChange,
        priceChangePercent,
        highPrice: high,
        lowPrice: low,
        volume,
        quoteVolume: recentTrades.reduce((sum, t) => sum + Number(t.price) * Number(t.amount), 0).toString(),
        openPrice,
      };
    }));

    return NextResponse.json({ success: true, data: tickers });
  } catch (error: any) {
    console.error('Ticker API error:', error?.message);
    return NextResponse.json({ success: false, error: 'Failed to fetch tickers' }, { status: 500 });
  }
}
