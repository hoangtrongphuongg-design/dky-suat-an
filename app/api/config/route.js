import { NextResponse } from 'next/server';
import { formatVietnamDate, getCutoff, getVietnamDate } from '@/lib/time';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  const cutoff = getCutoff();
  return NextResponse.json({
    date: getVietnamDate(),
    dateLabel: formatVietnamDate(),
    cutoff: cutoff?.raw || null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
