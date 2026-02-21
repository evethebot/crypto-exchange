import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { resetCircuitBreaker } from '@/lib/matching-engine';
import { rateLimitMap } from '@/app/api/v1/orders/route';

export async function POST(request: NextRequest) {
  // Only available in development/test
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    await db.execute(sql`DELETE FROM wallet_transactions`);
    await db.execute(sql`DELETE FROM login_history`);
    await db.execute(sql`DELETE FROM trades`);
    await db.execute(sql`DELETE FROM orders`);
    await db.execute(sql`DELETE FROM deposits`);
    await db.execute(sql`DELETE FROM withdrawals`);
    await db.execute(sql`DELETE FROM wallets`);
    await db.execute(sql`DELETE FROM refresh_tokens`);
    await db.execute(sql`DELETE FROM api_keys`);
    await db.execute(sql`DELETE FROM users WHERE email != 'admin@exchange.local'`);
    await db.execute(sql`UPDATE order_sequence SET last_seq = 0 WHERE id = 1`);

    // Reset in-memory state
    resetCircuitBreaker();
    rateLimitMap.clear();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
