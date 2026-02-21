import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tradingPairs } from '@/lib/db/schema';
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
    if (body.makerFeeBps !== undefined) updateData.makerFeeBps = body.makerFeeBps;
    if (body.takerFeeBps !== undefined) updateData.takerFeeBps = body.takerFeeBps;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.minAmount !== undefined) updateData.minAmount = body.minAmount;
    if (body.minTotal !== undefined) updateData.minTotal = body.minTotal;

    const [updated] = await db.update(tradingPairs).set(updateData).where(eq(tradingPairs.id, id)).returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Pair not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to update pair' }, { status: 500 });
  }
}
