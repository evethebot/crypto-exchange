import { getAuthFromRequest, JWTPayload } from './auth';
import { NextResponse } from 'next/server';

export function getAdminAuth(request: Request): JWTPayload | null {
  const auth = getAuthFromRequest(request);
  if (!auth) return null;
  if (auth.role !== 'admin') return null;
  return auth;
}

export function requireAdmin(request: Request): JWTPayload | NextResponse {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (auth.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  return auth;
}
