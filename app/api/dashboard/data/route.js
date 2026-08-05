import { NextResponse } from 'next/server';
import { DASHBOARD_COOKIE, verifyDashboardSession } from '@/lib/dashboardAuth';
import { getSql } from '@/lib/db';
import { getVietnamDate, isTimeAfterCutoff } from '@/lib/time';
import { isIsoDate } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function unauthorized() {
  return NextResponse.json({ error: 'Phiên xem dashboard đã hết hạn.' }, { status: 401 });
}

export async function GET(request) {
  if (!verifyDashboardSession(request.cookies.get(DASHBOARD_COOKIE)?.value)) return unauthorized();

  const params = new URL(request.url).searchParams;
  const today = getVietnamDate();
  const from = params.get('from') || today;
  const to = params.get('to') || today;
  const search = String(params.get('search') || '').trim().toLocaleLowerCase('vi-VN');
  if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
    return NextResponse.json({ error: 'Khoảng ngày không hợp lệ.' }, { status: 400 });
  }

  try {
    const sql = getSql();
    const [registrationRows, historyRows] = await Promise.all([
      sql`
        SELECT
          d.id, d.ngay_dang_ky, d.so_danh_bo, n.ho_ten,
          d.nhom_phu_trach, d.loai_suat, d.sl_cnv, d.sl_nha_thau, d.ghi_chu, d.da_huy, d.thoi_gian_nhap
        FROM dang_ky_suat_an d
        LEFT JOIN nhan_vien n ON n.so_danh_bo = d.so_danh_bo
        WHERE d.ngay_dang_ky BETWEEN ${from}::date AND ${to}::date
        ORDER BY d.thoi_gian_nhap DESC
      `,
      sql`
        SELECT
          l.id, l.thoi_gian, l.so_danh_bo, n.ho_ten, l.nhom_phu_trach, l.loai_suat,
          l.sl_cnv_truoc, l.sl_cnv_sau,
          l.sl_nha_thau_truoc, l.sl_nha_thau_sau,
          l.hanh_dong
        FROM lich_su_dang_ky_suat_an l
        LEFT JOIN nhan_vien n ON n.so_danh_bo = l.so_danh_bo
        WHERE l.ngay_dang_ky BETWEEN ${from}::date AND ${to}::date
        ORDER BY l.thoi_gian DESC
        LIMIT 200
      `,
    ]);

    const filtered = search
      ? registrationRows.filter((row) => [row.so_danh_bo, row.ho_ten, row.nhom_phu_trach]
          .some((value) => String(value || '').toLocaleLowerCase('vi-VN').includes(search)))
      : registrationRows;

    const items = filtered.map((row) => ({
      ...row,
      sl_cnv: Number(row.sl_cnv || 0),
      sl_nha_thau: Number(row.sl_nha_thau || 0),
      is_late: isTimeAfterCutoff(new Date(row.thoi_gian_nhap)),
    }));
    const history = historyRows.map((row) => ({
      ...row,
      sl_cnv_truoc: row.sl_cnv_truoc == null ? null : Number(row.sl_cnv_truoc),
      sl_cnv_sau: Number(row.sl_cnv_sau || 0),
      sl_nha_thau_truoc: row.sl_nha_thau_truoc == null ? null : Number(row.sl_nha_thau_truoc),
      sl_nha_thau_sau: Number(row.sl_nha_thau_sau || 0),
    }));

    return NextResponse.json({ items, history, from, to }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('dashboard data failed', error);
    return NextResponse.json({
      error: 'Không thể tải dữ liệu dashboard. Hãy kiểm tra migration trên Neon.',
    }, { status: 500 });
  }
}
