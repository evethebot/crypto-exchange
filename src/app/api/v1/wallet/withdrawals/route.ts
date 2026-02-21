import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withdrawals } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userWithdrawals = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, auth.userId))
      .orderBy(desc(withdrawals.createdAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      data: userWithdrawals,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch withdrawals' }, { status: 500 });
  }
}
