import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { isValidMealType } from '@/lib/mealTypes';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { getActiveNightDate, getVietnamDate, isRegistrationLocked } from '@/lib/time';
import { isValidEmployeeId, normalizeEmployeeId, validateRegistration } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function resolveTargetDate(loaiSuat) {
  return loaiSuat === 'dem' ? getActiveNightDate().date : getVietnamDate();
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const id = normalizeEmployeeId(params.get('id'));
  const loaiSuat = String(params.get('loai') || 'xe').trim();
  if (!isValidEmployeeId(id)) return NextResponse.json({ error: 'Số danh bộ không hợp lệ.' }, { status: 400 });
  if (!isValidMealType(loaiSuat)) return NextResponse.json({ error: 'Loại suất ăn không hợp lệ.' }, { status: 400 });

  try {
    const sql = getSql();
    const date = resolveTargetDate(loaiSuat);
    const rows = await sql`
      SELECT id, so_danh_bo, nhom_phu_trach, loai_suat, sl_cnv, sl_nha_thau, thoi_gian_nhap
      FROM dang_ky_suat_an
      WHERE so_danh_bo = ${id} AND ngay_dang_ky = ${date}::date AND loai_suat = ${loaiSuat}
      ORDER BY thoi_gian_nhap DESC
    `;
    return NextResponse.json({ items: rows, date }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('registration list failed', error);
    return NextResponse.json({ error: 'Không thể tải đăng ký hôm nay.' }, { status: 503 });
  }
}

export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`registration:${ip}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Thao tác quá nhanh. Vui lòng thử lại sau.' }, {
      status: 429,
      headers: { 'Retry-After': String(limit.retryAfter) },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }

  const checked = validateRegistration(body);
  if (checked.error) return NextResponse.json({ error: checked.error }, { status: 400 });
  const { soDanhBo, group, loaiSuat, cnv, contractor } = checked.value;

  // Suất đêm không có trạng thái khóa cứng: luôn có một ngày mục tiêu
  // đang mở (xem lib/time.js#getActiveNightDate), chỉ suất xế mới khóa
  // hẳn khi qua giờ chốt của hôm nay.
  if (loaiSuat === 'xe' && isRegistrationLocked()) {
    return NextResponse.json({ error: 'Đăng ký hôm nay đã khóa.' }, { status: 423 });
  }

  try {
    const sql = getSql();
    const date = resolveTargetDate(loaiSuat);
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
          AND ngay_dang_ky = ${date}::date
          AND nhom_phu_trach = ${group}
          AND loai_suat = ${loaiSuat}
      ), upserted AS (
        INSERT INTO dang_ky_suat_an (
          so_danh_bo, ngay_dang_ky, sl_cnv, sl_nha_thau, nhom_phu_trach, loai_suat, thoi_gian_nhap
        )
        VALUES (${soDanhBo}, ${date}::date, ${cnv}, ${contractor}, ${group}, ${loaiSuat}, CURRENT_TIMESTAMP)
        ON CONFLICT (so_danh_bo, ngay_dang_ky, nhom_phu_trach, loai_suat)
        DO UPDATE SET
          sl_cnv = EXCLUDED.sl_cnv,
          sl_nha_thau = EXCLUDED.sl_nha_thau,
          thoi_gian_nhap = CURRENT_TIMESTAMP
        RETURNING id, so_danh_bo, nhom_phu_trach, loai_suat, ngay_dang_ky, sl_cnv, sl_nha_thau, thoi_gian_nhap
      ), audited AS (
        INSERT INTO lich_su_dang_ky_suat_an (
          dang_ky_id, so_danh_bo, nhom_phu_trach, loai_suat, ngay_dang_ky,
          sl_cnv_truoc, sl_cnv_sau, sl_nha_thau_truoc, sl_nha_thau_sau,
          hanh_dong, dia_chi_ip
        )
        SELECT
          u.id, u.so_danh_bo, u.nhom_phu_trach, u.loai_suat, u.ngay_dang_ky,
          p.sl_cnv, u.sl_cnv, p.sl_nha_thau, u.sl_nha_thau,
          CASE WHEN p.sl_cnv IS NULL THEN 'Tạo mới' ELSE 'Cập nhật' END,
          ${ip}
        FROM upserted u LEFT JOIN previous p ON TRUE
      )
      SELECT * FROM upserted
    `;

    return NextResponse.json({
      success: true,
      message: 'Đã ghi nhận đăng ký suất ăn.',
      item: result[0],
    });
  } catch (error) {
    console.error('registration write failed', error);
    return NextResponse.json({
      error: 'Không thể lưu đăng ký. Hãy kiểm tra đã chạy file database/migration.sql trên Neon.',
    }, { status: 500 });
  }
}
