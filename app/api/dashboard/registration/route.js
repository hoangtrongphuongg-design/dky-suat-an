import { NextResponse } from 'next/server';
import { DASHBOARD_COOKIE, verifyDashboardSession } from '@/lib/dashboardAuth';
import { getSql } from '@/lib/db';
import { getClientIp } from '@/lib/rateLimit';
import { validateAdminRegistrationEdit, validateRegistration } from '@/lib/validation';

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

  const checked = validateRegistration(body);
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
          da_huy = FALSE,
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

export async function PATCH(request) {
  if (!verifyDashboardSession(request.cookies.get(DASHBOARD_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Phiên xem dashboard đã hết hạn.' }, { status: 401 });
  }

  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Mã đăng ký không hợp lệ.' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }
  const ip = getClientIp(request);

  // Chỉ toggle da_huy: giữ nguyên nhánh cũ (không đổi ngày/số lượng).
  if (Object.prototype.hasOwnProperty.call(body ?? {}, 'da_huy') && !Object.prototype.hasOwnProperty.call(body ?? {}, 'ngay_dang_ky')) {
    const daHuy = Boolean(body.da_huy);
    try {
      const sql = getSql();
      const result = await sql`
        WITH updated AS (
          UPDATE dang_ky_suat_an
          SET da_huy = ${daHuy}
          WHERE id = ${id}
          RETURNING id, so_danh_bo, nhom_phu_trach, loai_suat, ngay_dang_ky, sl_cnv, sl_nha_thau, da_huy
        ), audited AS (
          INSERT INTO lich_su_dang_ky_suat_an (
            dang_ky_id, so_danh_bo, nhom_phu_trach, loai_suat, ngay_dang_ky,
            sl_cnv_truoc, sl_cnv_sau, sl_nha_thau_truoc, sl_nha_thau_sau,
            hanh_dong, dia_chi_ip
          )
          SELECT
            u.id, u.so_danh_bo, u.nhom_phu_trach, u.loai_suat, u.ngay_dang_ky,
            u.sl_cnv, u.sl_cnv, u.sl_nha_thau, u.sl_nha_thau,
            CASE WHEN u.da_huy THEN 'Admin: Hủy đăng ký' ELSE 'Admin: Khôi phục đăng ký' END,
            ${ip}
          FROM updated u
        )
        SELECT * FROM updated
      `;

      if (!result.length) return NextResponse.json({ error: 'Không tìm thấy đăng ký.' }, { status: 404 });
      return NextResponse.json({
        success: true,
        message: daHuy ? 'Đã hủy đăng ký.' : 'Đã khôi phục đăng ký.',
        item: result[0],
      });
    } catch (error) {
      console.error('admin registration status update failed', error);
      return NextResponse.json({ error: 'Không thể cập nhật trạng thái.' }, { status: 500 });
    }
  }

  // Sửa đầy đủ (kể cả đổi ngày ăn): cập nhật đúng dòng theo id, không dùng
  // upsert-theo-khóa-tự-nhiên vì đổi ngày sẽ tạo dòng mới thay vì di chuyển dòng cũ.
  const checked = validateAdminRegistrationEdit(body);
  if (checked.error) return NextResponse.json({ error: checked.error }, { status: 400 });
  const { ngayDangKy, cnv, contractor, ghiChu } = checked.value;

  try {
    const sql = getSql();
    const result = await sql`
      WITH previous AS (
        SELECT sl_cnv, sl_nha_thau, ngay_dang_ky FROM dang_ky_suat_an WHERE id = ${id}
      ), updated AS (
        UPDATE dang_ky_suat_an
        SET ngay_dang_ky = ${ngayDangKy}::date,
            sl_cnv = ${cnv},
            sl_nha_thau = ${contractor},
            ghi_chu = ${ghiChu},
            thoi_gian_nhap = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING id, so_danh_bo, nhom_phu_trach, loai_suat, ngay_dang_ky, sl_cnv, sl_nha_thau, ghi_chu, da_huy
      ), audited AS (
        INSERT INTO lich_su_dang_ky_suat_an (
          dang_ky_id, so_danh_bo, nhom_phu_trach, loai_suat, ngay_dang_ky,
          sl_cnv_truoc, sl_cnv_sau, sl_nha_thau_truoc, sl_nha_thau_sau,
          hanh_dong, dia_chi_ip
        )
        SELECT
          u.id, u.so_danh_bo, u.nhom_phu_trach, u.loai_suat, u.ngay_dang_ky,
          p.sl_cnv, u.sl_cnv, p.sl_nha_thau, u.sl_nha_thau,
          CASE WHEN p.ngay_dang_ky IS DISTINCT FROM u.ngay_dang_ky THEN 'Admin: Đổi ngày đăng ký' ELSE 'Admin: Cập nhật' END,
          ${ip}
        FROM updated u LEFT JOIN previous p ON TRUE
      )
      SELECT * FROM updated
    `;

    if (!result.length) return NextResponse.json({ error: 'Không tìm thấy đăng ký.' }, { status: 404 });
    return NextResponse.json({
      success: true,
      message: 'Đã lưu thay đổi (quyền admin).',
      item: result[0],
    });
  } catch (error) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Nhân viên này đã có đăng ký khác trùng ngày/nhóm/loại suất.' }, { status: 409 });
    }
    console.error('admin registration edit failed', error);
    return NextResponse.json({ error: 'Không thể lưu thay đổi.' }, { status: 500 });
  }
}
