import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';
import { loginHistory } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const entries = await db
      .select({
        id: loginHistory.id,
        ip: loginHistory.ip,
        userAgent: loginHistory.userAgent,
        status: loginHistory.success,
        createdAt: loginHistory.createdAt,
      })
      .from(loginHistory)
      .where(eq(loginHistory.userId, auth.userId))
      .orderBy(desc(loginHistory.createdAt))
      .limit(50);

    const data = entries.map(e => ({
      ...e,
      status: e.status ? 'success' : 'failed',
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to fetch login history' }, { status: 500 });
  }
}
