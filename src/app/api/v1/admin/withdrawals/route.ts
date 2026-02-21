import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withdrawals } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { desc } from 'drizzle-orm';

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await db.select().from(withdrawals).orderBy(desc(withdrawals.createdAt)).limit(50);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: true, data: [] });
  }
}
