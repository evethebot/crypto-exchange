import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { code } = body;

    if (!code || code.length !== 6) {
      return NextResponse.json({ success: false, error: 'Invalid code' }, { status: 400 });
    }

    // In demo mode, accept any 6-digit code
    await db.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, auth.userId));

    return NextResponse.json({ success: true, data: { enabled: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}
