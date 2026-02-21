import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tradingPairs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const pairs = await db
      .select()
      .from(tradingPairs)
      .where(eq(tradingPairs.status, 'active'));

    return NextResponse.json({
      success: true,
      data: pairs.map(p => ({
        id: p.id,
        symbol: p.symbol,
        baseCurrency: p.baseCurrency,
        quoteCurrency: p.quoteCurrency,
        pricePrecision: p.pricePrecision,
        amountPrecision: p.amountPrecision,
        minAmount: p.minAmount,
        minTotal: p.minTotal,
        makerFeeBps: p.makerFeeBps,
        takerFeeBps: p.takerFeeBps,
        status: p.status,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trading pairs' },
      { status: 500 }
    );
  }
}
