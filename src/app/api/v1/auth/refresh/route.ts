import { NextResponse } from 'next/server';
import {
  verifyRefreshToken,
  generateAccessToken,
  isRefreshTokenValid,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token is required' },
        { status: 401 }
      );
    }

    // Verify JWT signature
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Check if token is stored and not revoked
    const valid = await isRefreshTokenValid(refreshToken);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Refresh token has been revoked' },
        { status: 401 }
      );
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}
