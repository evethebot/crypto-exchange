import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';

export async function POST(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'Old and new password required' }, { status: 400 });
    }

    // Fetch current user
    const [user] = await db.select().from(users).where(eq(users.id, auth.userId));
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Verify old password
    const valid = await bcryptjs.compare(oldPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Hash and update
    const hash = await bcryptjs.hash(newPassword, 10);
    await db.update(users).set({ passwordHash: hash }).where(eq(users.id, auth.userId));

    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to change password' }, { status: 500 });
  }
}
