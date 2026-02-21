import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, orders, trades, wallets, tradingPairs } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [userCount] = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const [orderCount] = await db.execute(sql`SELECT COUNT(*) as count FROM orders`);
    const [tradeCount] = await db.execute(sql`SELECT COUNT(*) as count FROM trades`);
    const [pairCount] = await db.execute(sql`SELECT COUNT(*) as count FROM trading_pairs WHERE status = 'active'`);
    const [volumeResult] = await db.execute(sql`
      SELECT COALESCE(SUM(CAST(amount AS numeric) * CAST(price AS numeric)), 0) as total_volume
      FROM trades
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: Number(userCount?.count || 0),
        totalOrders: Number(orderCount?.count || 0),
        totalTrades: Number(tradeCount?.count || 0),
        activePairs: Number(pairCount?.count || 0),
        volume24h: String(volumeResult?.total_volume || '0'),
      },
    });
  } catch (error: any) {
    console.error('Admin stats error:', error?.message);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
