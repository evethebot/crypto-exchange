import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.role !== undefined) updateData.role = body.role;

    const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { id: updated.id, email: updated.email, role: updated.role, status: updated.status },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
  }
}
