import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tradingPairs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCircuitBreakerStatus } from '@/lib/matching-engine';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const [pair] = await db
      .select()
      .from(tradingPairs)
      .where(eq(tradingPairs.symbol, symbol))
      .limit(1);

    if (!pair) {
      return NextResponse.json(
        { success: false, error: 'Trading pair not found' },
        { status: 404 }
      );
    }

    const cbStatus = getCircuitBreakerStatus(pair.symbol);

    return NextResponse.json({
      success: true,
      data: {
        id: pair.id,
        symbol: pair.symbol,
        baseCurrency: pair.baseCurrency,
        quoteCurrency: pair.quoteCurrency,
        pricePrecision: pair.pricePrecision,
        amountPrecision: pair.amountPrecision,
        minAmount: pair.minAmount,
        minTotal: pair.minTotal,
        makerFeeBps: pair.makerFeeBps,
        takerFeeBps: pair.takerFeeBps,
        status: pair.status,
        circuitBreaker: cbStatus,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trading pair' },
      { status: 500 }
    );
  }
}
