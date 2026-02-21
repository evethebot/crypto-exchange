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
    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json({ success: false, error: 'Phone and code required' }, { status: 400 });
    }

    // Simulated verification - any 6-digit code works in demo
    if (code.length < 4) {
      return NextResponse.json({ success: false, error: 'Invalid verification code' }, { status: 400 });
    }

    // Upgrade KYC level
    await db.update(users).set({ kycLevel: 'level_1' }).where(eq(users.id, auth.userId));

    return NextResponse.json({ success: true, data: { level: 1, status: 'verified' } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}
