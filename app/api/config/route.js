import { NextResponse } from 'next/server';
import { getActiveRegistrationDate, getCutoff } from '@/lib/time';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  const cutoff = getCutoff();
  const active = getActiveRegistrationDate();
  const info = { date: active.date, dateLabel: active.dateLabel, cutoff: cutoff?.raw || null };
  return NextResponse.json({ xe: info, dem: info }, { headers: { 'Cache-Control': 'no-store' } });
}
