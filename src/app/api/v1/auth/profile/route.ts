import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        nickname: users.nickname,
        kycLevel: users.kycLevel,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, auth.userId));

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updateData: any = {};
    if (body.nickname !== undefined) updateData.nickname = body.nickname;

    const [updated] = await db.update(users).set(updateData).where(eq(users.id, auth.userId)).returning();

    return NextResponse.json({ success: true, data: { id: updated.id, email: updated.email, nickname: updated.nickname } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
  }
}
