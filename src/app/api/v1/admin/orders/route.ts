import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { desc, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    let result;
    if (status) {
      result = await db.select().from(orders).where(eq(orders.status, status as any)).orderBy(desc(orders.createdAt)).limit(50);
    } else {
      result = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(50);
    }
    
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: true, data: [] });
  }
}
