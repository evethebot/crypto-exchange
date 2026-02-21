import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { walletTransactions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const transactions = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, auth.userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
