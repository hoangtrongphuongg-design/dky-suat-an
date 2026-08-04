export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
import { neon } from '@neondatabase/serverless';

export default async function Dashboard() {
  const sql = neon(process.env.DATABASE_URL);

  const data = await sql`
    SELECT 
      d.so_danh_bo, 
      n.ho_ten,
      d.nhom_phu_trach,
      d.sl_cnv, 
      d.sl_nha_thau, 
      d.thoi_gian_nhap
    FROM dang_ky_suat_an d
    JOIN nhan_vien n ON d.so_danh_bo = n.so_danh_bo
    WHERE d.ngay_dang_ky = CURRENT_DATE
    ORDER BY d.thoi_gian_nhap DESC
  `;

  const tongCnv = data.reduce((acc, curr) => acc + curr.sl_cnv, 0);
  const tongNhaThau = data.reduce((acc, curr) => acc + curr.sl_nha_thau, 0);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>TỔNG HỢP SUẤT ĂN HÔM NAY</h2>

      <div style={{ display: 'flex', justifyContent: 'space-around', backgroundColor: '#e9ecef', padding: '15px', borderRadius: '5px', marginBottom: '20px', fontSize: '18px' }}>
        <div>Tổng suất CNV: <strong style={{ color: '#d9534f', fontSize: '24px' }}>{tongCnv}</strong></div>
        <div>Tổng suất Nhà thầu: <strong style={{ color: '#d9534f', fontSize: '24px' }}>{tongNhaThau}</strong></div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '14px' }}>
        <thead>
          <tr style={{ backgroundColor: '#0056b3', color: 'white' }}>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Số DB</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Họ tên</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Nhóm</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>CNV</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Nhà thầu</th>
            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Giờ ghi nhận</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{row.so_danh_bo}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>{row.ho_ten}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>{row.nhom_phu_trach || 'Cối'}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{row.sl_cnv}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{row.sl_nha_thau}</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                {new Date(row.thoi_gian_nhap).toLocaleTimeString("vi-VN", {timeZone: "Asia/Ho_Chi_Minh"})}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
