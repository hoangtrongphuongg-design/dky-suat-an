import { NextResponse } from 'next/server';
import { DASHBOARD_COOKIE, verifyDashboardSession } from '@/lib/dashboardAuth';
import { getSql } from '@/lib/db';
import { MEAL_TYPE_LABELS } from '@/lib/mealTypes';
import { getVietnamDate } from '@/lib/time';
import { isIsoDate } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function csvCell(value) {
  const text = String(value ?? '').replaceAll('"', '""');
  return `"${text}"`;
}

export async function GET(request) {
  if (!verifyDashboardSession(request.cookies.get(DASHBOARD_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const today = getVietnamDate();
  const from = params.get('from') || today;
  const to = params.get('to') || today;
  if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
    return NextResponse.json({ error: 'Khoảng ngày không hợp lệ.' }, { status: 400 });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT
        d.ngay_dang_ky, d.thoi_gian_nhap, d.so_danh_bo, n.ho_ten,
        d.nhom_phu_trach, d.loai_suat, d.sl_cnv, d.sl_nha_thau, d.ghi_chu, d.da_huy
      FROM dang_ky_suat_an d
      LEFT JOIN nhan_vien n ON n.so_danh_bo = d.so_danh_bo
      WHERE d.ngay_dang_ky BETWEEN ${from}::date AND ${to}::date
      ORDER BY d.ngay_dang_ky DESC, d.thoi_gian_nhap DESC
    `;

    const header = ['Ngày', 'Loại', 'Thời gian ghi nhận', 'Số danh bộ', 'Họ tên', 'Nhóm', 'Xưởng Sửa chữa', 'Nhà thầu', 'Tổng', 'Ghi chú', 'Trạng thái'];
    const lines = [header.map(csvCell).join(';')];
    for (const row of rows) {
      const cnv = Number(row.sl_cnv || 0);
      const contractor = Number(row.sl_nha_thau || 0);
      lines.push([
        row.ngay_dang_ky,
        MEAL_TYPE_LABELS[row.loai_suat] || row.loai_suat,
        new Date(row.thoi_gian_nhap).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        row.so_danh_bo,
        row.ho_ten || '',
        row.nhom_phu_trach,
        cnv,
        contractor,
        cnv + contractor,
        row.ghi_chu || '',
        row.da_huy ? 'Đã hủy' : 'Đã xác nhận',
      ].map(csvCell).join(';'));
    }

    return new NextResponse(`\uFEFF${lines.join('\r\n')}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="suat-an_${from}_${to}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('export failed', error);
    return NextResponse.json({ error: 'Không thể xuất dữ liệu.' }, { status: 500 });
  }
}
