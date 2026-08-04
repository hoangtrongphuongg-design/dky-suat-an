"use client";
import { useState } from 'react';

export default function Home() {
  const [soDanhBo, setSoDanhBo] = useState('');
  const [hoTen, setHoTen] = useState('');
  const [slCnv, setSlCnv] = useState(0);
  const [slNhaThau, setSlNhaThau] = useState(0);
  const [message, setMessage] = useState('');

  const kiemTraDanhBo = async (id) => {
    setSoDanhBo(id);
    if(id.length >= 3) {
      const res = await fetch(`/api/nhan-vien?id=${id}`);
      const data = await res.json();
      setHoTen(data.ho_ten || 'Không tìm thấy, vui lòng nhập lại');
    }
  };

  const guiDangKy = async (e) => {
    e.preventDefault();
    setMessage('Đang xử lý...');
    const res = await fetch('/api/dang-ky', {
      method: 'POST',
      body: JSON.stringify({ so_danh_bo: soDanhBo, sl_cnv: slCnv, sl_nha_thau: slNhaThau }),
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if(res.ok) setMessage("✅ " + data.message);
    else setMessage("❌ LỖI: " + data.error);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center' }}>Đăng Ký Suất Ăn Xế SCL</h2>
      <form onSubmit={guiDangKy} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <label>Số danh bộ:
          <input type="text" value={soDanhBo} onChange={(e) => kiemTraDanhBo(e.target.value)} required style={{width: '100%', padding: '10px', marginTop: '5px'}} />
        </label>
        <label>Họ tên:
          <input type="text" value={hoTen} disabled style={{width: '100%', padding: '10px', marginTop: '5px', backgroundColor: '#e9ecef'}} />
        </label>
        <label>Suất ăn CNV:
          <input type="number" value={slCnv} onChange={(e) => setSlCnv(Number(e.target.value))} min="0" style={{width: '100%', padding: '10px', marginTop: '5px'}}/>
        </label>
        <label>Suất ăn Nhà thầu:
          <input type="number" value={slNhaThau} onChange={(e) => setSlNhaThau(Number(e.target.value))} min="0" style={{width: '100%', padding: '10px', marginTop: '5px'}}/>
        </label>
        <button type="submit" style={{ padding: '12px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
          XÁC NHẬN ĐĂNG KÝ
        </button>
      </form>
      {message && <p style={{marginTop: '20px', padding: '10px', backgroundColor: '#f8d7da', borderRadius: '5px'}}>{message}</p>}
    </div>
  );
}
