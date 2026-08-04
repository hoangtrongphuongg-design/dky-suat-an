import { NextResponse } from 'next/server';
import { formatVietnamDate, getActiveNightDate, getCutoff, getVietnamDate, isRegistrationLocked } from '@/lib/time';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  const cutoff = getCutoff();
  const night = getActiveNightDate();
  return NextResponse.json({
    xe: {
      date: getVietnamDate(),
      dateLabel: formatVietnamDate(),
      cutoff: cutoff?.raw || null,
      locked: isRegistrationLocked(),
    },
    dem: {
      date: night.date,
      dateLabel: night.dateLabel,
      cutoff: cutoff?.raw || null,
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
