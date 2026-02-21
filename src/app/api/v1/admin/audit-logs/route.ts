import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    success: true,
    data: [],
  });
}
