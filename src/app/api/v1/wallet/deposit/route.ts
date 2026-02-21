import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wallets, deposits, walletTransactions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { currency, amount } = body;

    if (!currency || !amount) {
      return NextResponse.json(
        { success: false, error: 'Currency and amount are required' },
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

    // Upsert wallet
    const [existing] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.userId, auth.userId), eq(wallets.currency, currency.toUpperCase())))
      .limit(1);

    let newBalance: string;

    if (existing) {
      const [updated] = await db
        .update(wallets)
        .set({
          available: sql`${wallets.available} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, existing.id))
        .returning();
      newBalance = updated.available;
    } else {
      const [created] = await db
        .insert(wallets)
        .values({
          userId: auth.userId,
          currency: currency.toUpperCase(),
          available: amount,
          frozen: '0',
        })
        .returning();
      newBalance = created.available;
    }

    // Record deposit
    const [deposit] = await db
      .insert(deposits)
      .values({
        userId: auth.userId,
        currency: currency.toUpperCase(),
        amount,
        status: 'completed',
        confirmations: 3,
      })
      .returning();

    // Record wallet transaction
    await db.insert(walletTransactions).values({
      userId: auth.userId,
      currency: currency.toUpperCase(),
      type: 'deposit',
      amount,
      balance: newBalance,
      referenceId: deposit.id,
      referenceType: 'deposit',
    });

    return NextResponse.json({
      success: true,
      data: {
        id: deposit.id,
        currency: currency.toUpperCase(),
        amount,
        status: 'completed',
        balance: newBalance,
      },
    });
  } catch (error: any) {
    console.error('Deposit error:', error?.message);
    return NextResponse.json(
      { success: false, error: 'Deposit failed' },
      { status: 500 }
    );
  }
}
