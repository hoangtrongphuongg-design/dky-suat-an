import { NextResponse } from 'next/server';
import { formatVietnamDate, getCutoff, getVietnamDate, isRegistrationLocked } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cutoff = getCutoff();
  return NextResponse.json({
    date: getVietnamDate(),
    dateLabel: formatVietnamDate(),
    cutoff: cutoff?.raw || null,
    locked: isRegistrationLocked(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
