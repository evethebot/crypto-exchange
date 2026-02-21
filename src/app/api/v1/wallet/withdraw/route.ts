import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wallets, withdrawals, walletTransactions } from '@/lib/db/schema';
import { eq, and, sql, gte } from 'drizzle-orm';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { currency, amount, address, network } = body;

    if (!currency || !amount || !address) {
      return NextResponse.json(
        { success: false, error: 'Currency, amount, and address are required' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // Atomically deduct balance (only if sufficient)
    const result = await db
      .update(wallets)
      .set({
        available: sql`${wallets.available} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(wallets.userId, auth.userId),
          eq(wallets.currency, currency.toUpperCase()),
          gte(wallets.available, amount)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    const [updated] = result;

    // Record withdrawal
    const [withdrawal] = await db
      .insert(withdrawals)
      .values({
        userId: auth.userId,
        currency: currency.toUpperCase(),
        amount,
        fee: '0',
        address,
        status: 'completed',
      })
      .returning();

    // Record wallet transaction
    await db.insert(walletTransactions).values({
      userId: auth.userId,
      currency: currency.toUpperCase(),
      type: 'withdrawal',
      amount: `-${amount}`,
      balance: updated.available,
      referenceId: withdrawal.id,
      referenceType: 'withdrawal',
    });

    return NextResponse.json({
      success: true,
      data: {
        id: withdrawal.id,
        currency: currency.toUpperCase(),
        amount,
        status: 'completed',
        balance: updated.available,
      },
    });
  } catch (error: any) {
    console.error('Withdrawal error:', error?.message);
    return NextResponse.json(
      { success: false, error: 'Withdrawal failed' },
      { status: 500 }
    );
  }
}
