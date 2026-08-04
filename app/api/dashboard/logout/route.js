import { NextResponse } from 'next/server';
import { DASHBOARD_COOKIE } from '@/lib/dashboardAuth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(DASHBOARD_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
