import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check database connectivity
    const result = await db.execute(sql`SELECT 1 as ok`);
    const dbConnected = result.length > 0;

    return NextResponse.json({
      success: true,
      data: {
        status: 'ok',
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: {
        status: 'degraded',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  }
}
