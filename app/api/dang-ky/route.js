import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // [ĐÃ TẠM TẮT ĐỂ CHẠY THỬ] - Bỏ qua kiểm tra giờ
    /* 
    const vnTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    if (vnTime.getHours() >= 9) {
      return NextResponse.json({ error: "Đã qua 9h00 sáng, hệ thống đã khóa sổ đăng ký suất ăn xế hôm nay." }, { status: 403 });
    }
    */

    const { so_danh_bo, sl_cnv, sl_nha_thau } = await request.json();
    const sql = neon(process.env.DATABASE_URL);

    await sql`
      INSERT INTO dang_ky_suat_an (so_danh_bo, ngay_dang_ky, sl_cnv, sl_nha_thau)
      VALUES (${so_danh_bo}, CURRENT_DATE, ${sl_cnv}, ${sl_nha_thau})
      ON CONFLICT (so_danh_bo, ngay_dang_ky) 
      DO UPDATE SET 
        sl_cnv = EXCLUDED.sl_cnv, 
        sl_nha_thau = EXCLUDED.sl_nha_thau,
        thoi_gian_nhap = CURRENT_TIMESTAMP;
    `;

    return NextResponse.json({ success: true, message: "Đã cập nhật số liệu suất ăn thành công!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi máy chủ, vui lòng thử lại sau." }, { status: 500 });
  }
}
