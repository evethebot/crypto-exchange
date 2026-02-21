import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

// In-memory config store (in production, use database)
let systemConfig: Record<string, any> = {
  max_open_orders_per_user: 50,
  max_withdrawal_per_day: 100000,
  maintenance_mode: false,
  min_trade_amount: '0.0001',
};

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({ success: true, data: systemConfig });
}

export async function PATCH(request: Request) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    systemConfig = { ...systemConfig, ...body };
    return NextResponse.json({ success: true, data: systemConfig });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to update config' }, { status: 500 });
  }
}
