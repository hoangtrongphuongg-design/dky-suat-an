import { NextResponse } from 'next/server';
import { DASHBOARD_COOKIE, verifyDashboardSession } from '@/lib/dashboardAuth';
import { getSql } from '@/lib/db';
import { getClientIp } from '@/lib/rateLimit';
import { validateAdminRegistration } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(request) {
  if (!verifyDashboardSession(request.cookies.get(DASHBOARD_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Phiên xem dashboard đã hết hạn.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }

  const checked = validateAdminRegistration(body);
  if (checked.error) return NextResponse.json({ error: checked.error }, { status: 400 });
  const { soDanhBo, group, loaiSuat, ngayDangKy, cnv, contractor, ghiChu } = checked.value;
  const ip = getClientIp(request);

  try {
    const sql = getSql();
    const employee = await sql`
      SELECT ho_ten FROM nhan_vien
      WHERE so_danh_bo = ${soDanhBo}
        AND COALESCE(dang_hoat_dong, TRUE) = TRUE
      LIMIT 1
    `;
    if (!employee.length) return NextResponse.json({ error: 'Không tìm thấy nhân viên.' }, { status: 404 });

    const result = await sql`
      WITH previous AS MATERIALIZED (
        SELECT sl_cnv, sl_nha_thau
        FROM dang_ky_suat_an
        WHERE so_danh_bo = ${soDanhBo}
          AND ngay_dang_ky = ${ngayDangKy}::date
          AND nhom_phu_trach = ${group}
          AND loai_suat = ${loaiSuat}
      ), upserted AS (
        INSERT INTO dang_ky_suat_an (
          so_danh_bo, ngay_dang_ky, sl_cnv, sl_nha_thau, nhom_phu_trach, loai_suat, ghi_chu, thoi_gian_nhap
        )
        VALUES (${soDanhBo}, ${ngayDangKy}::date, ${cnv}, ${contractor}, ${group}, ${loaiSuat}, ${ghiChu}, CURRENT_TIMESTAMP)
        ON CONFLICT (so_danh_bo, ngay_dang_ky, nhom_phu_trach, loai_suat)
        DO UPDATE SET
          sl_cnv = EXCLUDED.sl_cnv,
          sl_nha_thau = EXCLUDED.sl_nha_thau,
          ghi_chu = EXCLUDED.ghi_chu,
          thoi_gian_nhap = CURRENT_TIMESTAMP
        RETURNING id, so_danh_bo, nhom_phu_trach, loai_suat, ngay_dang_ky, sl_cnv, sl_nha_thau, ghi_chu, thoi_gian_nhap
      ), audited AS (
        INSERT INTO lich_su_dang_ky_suat_an (
          dang_ky_id, so_danh_bo, nhom_phu_trach, loai_suat, ngay_dang_ky,
          sl_cnv_truoc, sl_cnv_sau, sl_nha_thau_truoc, sl_nha_thau_sau,
          hanh_dong, dia_chi_ip
        )
        SELECT
          u.id, u.so_danh_bo, u.nhom_phu_trach, u.loai_suat, u.ngay_dang_ky,
          p.sl_cnv, u.sl_cnv, p.sl_nha_thau, u.sl_nha_thau,
          CASE WHEN p.sl_cnv IS NULL THEN 'Admin: Tạo mới' ELSE 'Admin: Cập nhật' END,
          ${ip}
        FROM upserted u LEFT JOIN previous p ON TRUE
      )
      SELECT * FROM upserted
    `;

    return NextResponse.json({
      success: true,
      message: 'Đã lưu thay đổi (quyền admin).',
      item: result[0],
    });
  } catch (error) {
    console.error('admin registration write failed', error);
    return NextResponse.json({ error: 'Không thể lưu thay đổi.' }, { status: 500 });
  }
}
