import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

function generateBase32Secret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  const bytes = crypto.randomBytes(20);
  for (let i = 0; i < 20; i++) {
    result += chars[bytes[i] % 32];
  }
  return result;
}

export async function POST(request: Request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const secret = generateBase32Secret();

    // Store the secret (not yet enabled)
    await db.update(users).set({ twoFactorSecret: secret }).where(eq(users.id, auth.userId));

    // Generate a simple QR code data URL (in production, use a proper TOTP library)
    const otpauthUrl = `otpauth://totp/CryptoExchange:${auth.email}?secret=${secret}&issuer=CryptoExchange`;
    
    return NextResponse.json({
      success: true,
      data: {
        secret,
        otpauthUrl,
        qrCode: '', // In production, generate QR code image
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to setup 2FA' }, { status: 500 });
  }
}
