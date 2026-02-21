import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, tradingPairs, wallets } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getAuthFromRequest } from '@/lib/auth';
import { processOrder, freezeBalance, checkCircuitBreaker } from '@/lib/matching-engine';

// ===== Rate Limiting: 5 orders per second per user =====
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  // Remove expired timestamps
  const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (valid.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(userId, valid);
    return false; // rate limited
  }
  valid.push(now);
  rateLimitMap.set(userId, valid);
  return true; // allowed
}

export async function POST(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit check
  if (!checkRateLimit(auth.userId)) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Maximum 5 orders per second.' },
      { status: 429 }
    );
  }

  try {
    // ===== Max Open Orders Check (200 per user) =====
    const MAX_OPEN_ORDERS = 200;
    const openOrderCount = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM orders
      WHERE user_id = ${auth.userId} AND status IN ('new', 'partially_filled')
    `);
    const currentCount = Number(openOrderCount[0]?.cnt || 0);
    if (currentCount >= MAX_OPEN_ORDERS) {
      return NextResponse.json(
        { success: false, error: 'MAX_OPEN_ORDERS: Maximum 200 open orders per user' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { symbol, side, type, price, amount } = body;

    // Validate required fields
    if (!symbol || !side || !type || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: symbol, side, type, amount' },
        { status: 400 }
      );
    }

    if (!['buy', 'sell'].includes(side)) {
      return NextResponse.json({ success: false, error: 'Side must be buy or sell' }, { status: 400 });
    }

    if (!['limit', 'market'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Type must be limit or market' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be positive' }, { status: 400 });
    }

    if (type === 'limit' && (!price || Number(price) <= 0)) {
      return NextResponse.json({ success: false, error: 'Limit orders require a positive price' }, { status: 400 });
    }

    // Validate trading pair
    const [pair] = await db
      .select()
      .from(tradingPairs)
      .where(eq(tradingPairs.symbol, symbol))
      .limit(1);

    if (!pair || pair.status !== 'active') {
      return NextResponse.json({ success: false, error: 'INVALID_SYMBOL' }, { status: 400 });
    }

    // Validate min amount
    if (numAmount < Number(pair.minAmount)) {
      return NextResponse.json({ success: false, error: 'AMOUNT_TOO_SMALL' }, { status: 400 });
    }

    // Validate min total for limit orders
    if (type === 'limit') {
      const total = numAmount * Number(price);
      if (total < Number(pair.minTotal)) {
        return NextResponse.json({ success: false, error: 'Total value below minimum' }, { status: 400 });
      }
    }

    // ===== Circuit Breaker Check =====
    if (type === 'limit' && price) {
      const cbCheck = checkCircuitBreaker(symbol, Number(price));
      if (!cbCheck.allowed) {
        return NextResponse.json({ success: false, error: cbCheck.error }, { status: 400 });
      }
    }

    // Freeze balance
    const baseCurrency = symbol.split('_')[0];
    const quoteCurrency = symbol.split('_')[1];

    if (side === 'buy') {
      // For buy orders, freeze quote currency
      const freezeAmount = type === 'limit' ? numAmount * Number(price) : numAmount * 1000000; // market: estimate
      const frozen = await freezeBalance(auth.userId, quoteCurrency, type === 'limit' ? numAmount * Number(price) : 0);
      
      if (type === 'limit' && !frozen) {
        return NextResponse.json({ success: false, error: 'INSUFFICIENT_BALANCE' }, { status: 400 });
      }
    } else {
      // For sell orders, freeze base currency
      const frozen = await freezeBalance(auth.userId, baseCurrency, numAmount);
      if (!frozen) {
        return NextResponse.json({ success: false, error: 'INSUFFICIENT_BALANCE' }, { status: 400 });
      }
    }

    // Process through matching engine
    const result = await processOrder({
      userId: auth.userId,
      symbol,
      side,
      type,
      price: price?.toString(),
      amount: amount.toString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.orderId,
        symbol,
        side,
        type,
        price: price || null,
        amount,
        filled: result.filled,
        remaining: result.remaining,
        status: result.status,
        trades: result.trades,
      },
    });
  } catch (error: any) {
    console.error('Order error:', error?.message);
    return NextResponse.json({ success: false, error: 'Order placement failed' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const status = searchParams.get('status');

    let query = db
      .select()
      .from(orders)
      .where(eq(orders.userId, auth.userId))
      .orderBy(desc(orders.createdAt))
      .limit(100);

    // Default to open orders only (new + partially_filled) unless status specified
    const statusFilter = status === 'all'
      ? []
      : status
        ? [eq(orders.status, status as any)]
        : [sql`${orders.status} IN ('new', 'partially_filled')`];

    const userOrders = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.userId, auth.userId),
        ...(symbol ? [eq(orders.symbol, symbol)] : []),
        ...statusFilter,
      ))
      .orderBy(desc(orders.createdAt))
      .limit(100);

    return NextResponse.json({
      success: true,
      data: userOrders,
    });
  } catch (error: any) {
    console.error('Get orders error:', error?.message);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    // Cancel all open orders for user (optionally filtered by symbol)
    const openOrders = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.userId, auth.userId),
        sql`${orders.status} IN ('new', 'partially_filled')`,
        ...(symbol ? [eq(orders.symbol, symbol)] : []),
      ));

    for (const order of openOrders) {
      await cancelOrder(order, auth.userId);
    }

    return NextResponse.json({ success: true, data: { cancelled: openOrders.length } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to cancel orders' }, { status: 500 });
  }
}

async function cancelOrder(order: any, userId: string) {
  const { unfreezeBalanceOnCancel } = await import('@/lib/matching-engine');
  
  await db.update(orders).set({
    status: 'cancelled',
    updatedAt: new Date(),
  }).where(eq(orders.id, order.id));

  // Unfreeze remaining balance
  const remaining = Number(order.remaining);
  if (remaining > 0) {
    const baseCurrency = order.symbol.split('_')[0];
    const quoteCurrency = order.symbol.split('_')[1];

    if (order.side === 'buy' && order.price) {
      await unfreezeBalanceOnCancel(userId, quoteCurrency, remaining * Number(order.price));
    } else if (order.side === 'sell') {
      await unfreezeBalanceOnCancel(userId, baseCurrency, remaining);
    }
  }
}
