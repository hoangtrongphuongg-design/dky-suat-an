import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { isValidEmployeeId, normalizeEmployeeId } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`employee:${ip}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Thao tác quá nhanh. Vui lòng thử lại sau.' }, {
      status: 429,
      headers: { 'Retry-After': String(limit.retryAfter) },
    });
  }

  const id = normalizeEmployeeId(new URL(request.url).searchParams.get('id'));
  if (!isValidEmployeeId(id)) {
    return NextResponse.json({ error: 'Số danh bộ không hợp lệ.' }, { status: 400 });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT so_danh_bo, ho_ten
      FROM nhan_vien
      WHERE so_danh_bo = ${id}
        AND COALESCE(dang_hoat_dong, TRUE) = TRUE
      LIMIT 1
    `;
    if (!rows.length) return NextResponse.json({ error: 'Không tìm thấy nhân viên.' }, { status: 404 });
    return NextResponse.json(rows[0], { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('employee lookup failed', error);
    return NextResponse.json({ error: 'Không thể tra cứu dữ liệu nhân viên.' }, { status: 503 });
  }
}
