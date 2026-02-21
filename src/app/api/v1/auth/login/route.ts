import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, loginHistory } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { success: false, error: 'Account temporarily locked. Too many failed attempts.' },
        { status: 403 }
      );
    }

    // Check if account is suspended
    if (user.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'Account suspended' },
        { status: 403 }
      );
    }

    // Verify password
    const validPassword = await comparePassword(password, user.passwordHash);
    
    if (!validPassword) {
      // Increment failed login attempts
      const newAttempts = user.failedLoginAttempts + 1;
      const updates: any = {
        failedLoginAttempts: newAttempts,
      };
      
      // Lock after 5 failed attempts (30 minutes)
      if (newAttempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        updates.status = 'locked' as const;
      }
      
      await db.update(users).set(updates).where(eq(users.id, user.id));

      // Record failed login
      await db.insert(loginHistory).values({
        userId: user.id,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        success: false,
      });

      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Reset failed login attempts on success
    await db.update(users).set({ 
      failedLoginAttempts: 0, 
      lockedUntil: null,
      status: 'active' as const,
    }).where(eq(users.id, user.id));

    // Record successful login
    await db.insert(loginHistory).values({
      userId: user.id,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      success: true,
    });

    // Generate tokens
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    await storeRefreshToken(user.id, refreshToken);

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          kycLevel: user.kycLevel,
        },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error?.message);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
