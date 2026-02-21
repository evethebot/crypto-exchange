import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiKeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function GET(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const keys = await db.select({
      id: apiKeys.id,
      name: apiKeys.name,
      active: apiKeys.active,
      createdAt: apiKeys.createdAt,
    }).from(apiKeys).where(eq(apiKeys.userId, auth.userId));

    return NextResponse.json({ success: true, data: keys });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const apiKey = `cx_${crypto.randomBytes(16).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const [created] = await db.insert(apiKeys).values({
      userId: auth.userId,
      name: body.name || 'Default',
      keyHash,
    }).returning();

    return NextResponse.json({
      success: true,
      data: {
        id: created.id,
        apiKey,
        secret,
        name: created.name,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to create API key' }, { status: 500 });
  }
}
