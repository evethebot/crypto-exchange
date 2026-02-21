import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { sql, desc, ilike } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    let userList;
    if (search) {
      userList = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(ilike(users.email, `%${search}%`))
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      userList = await query;
    }

    return NextResponse.json({ success: true, data: userList });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}
