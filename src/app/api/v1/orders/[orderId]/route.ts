import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthFromRequest } from '@/lib/auth';
import { unfreezeBalanceOnCancel } from '@/lib/matching-engine';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId } = await params;
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, auth.userId)))
    .limit(1);

  if (!order) {
    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: order });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId } = await params;

  try {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (order.userId !== auth.userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (order.status === 'filled' || order.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'ORDER_NOT_CANCELLABLE' },
        { status: 400 }
      );
    }

    // Cancel order
    await db.update(orders).set({
      status: 'cancelled',
      updatedAt: new Date(),
    }).where(eq(orders.id, orderId));

    // Unfreeze remaining balance
    const remaining = Number(order.remaining);
    if (remaining > 0) {
      const baseCurrency = order.symbol.split('_')[0];
      const quoteCurrency = order.symbol.split('_')[1];

      if (order.side === 'buy' && order.price) {
        await unfreezeBalanceOnCancel(auth.userId, quoteCurrency, remaining * Number(order.price));
      } else if (order.side === 'sell') {
        await unfreezeBalanceOnCancel(auth.userId, baseCurrency, remaining);
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: orderId, status: 'cancelled' },
    });
  } catch (error: any) {
    console.error('Cancel order error:', error?.message);
    return NextResponse.json({ success: false, error: 'Failed to cancel order' }, { status: 500 });
  }
}
