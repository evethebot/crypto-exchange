import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deposits } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userDeposits = await db
      .select()
      .from(deposits)
      .where(eq(deposits.userId, auth.userId))
      .orderBy(desc(deposits.createdAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      data: userDeposits,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch deposits' }, { status: 500 });
  }
}
