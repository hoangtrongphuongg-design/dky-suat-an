import { NextResponse } from 'next/server';
import {
  DASHBOARD_COOKIE,
  createDashboardSession,
  isDashboardConfigured,
  pinsMatch,
} from '@/lib/dashboardAuth';
import { checkRateLimit, getClientIp, resetRateLimit } from '@/lib/rateLimit';

export async function POST(request) {
  const ip = getClientIp(request);
  const key = `dashboard-login:${ip}`;
  const limit = checkRateLimit(key, 5, 15 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Đã nhập sai quá nhiều lần. Vui lòng thử lại sau.' }, {
      status: 429,
      headers: { 'Retry-After': String(limit.retryAfter) },
    });
  }

  if (!isDashboardConfigured()) {
    return NextResponse.json({ error: 'Dashboard chưa được cấu hình mã xem trên Vercel.' }, { status: 503 });
  }

  const { pin } = await request.json().catch(() => ({}));
  if (!pinsMatch(pin)) return NextResponse.json({ error: 'Mã xem không đúng.' }, { status: 401 });

  resetRateLimit(key);
  const session = createDashboardSession();
  const response = NextResponse.json({ success: true });
  response.cookies.set(DASHBOARD_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: session.maxAge,
  });
  return response;
}
