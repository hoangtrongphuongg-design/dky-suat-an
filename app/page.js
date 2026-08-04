"use client";
import { useState } from 'react';

export default function Home() {
  const [soDanhBo, setSoDanhBo] = useState('');
  const [hoTen, setHoTen] = useState('');
  const [nhomPhuTrach, setNhomPhuTrach] = useState('Cối');
  const [slCnv, setSlCnv] = useState(0);
  const [slNhaThau, setSlNhaThau] = useState(0);
  const [message, setMessage] = useState('');

  const kiemTraDanhBo = async (id) => {
    setSoDanhBo(id);
    if(id.length >= 4) {
      const res = await fetch(`/api/nhan-vien?id=${id}`);
      const data = await res.json();
      setHoTen(data.ho_ten || 'Không tìm thấy, vui lòng kiểm tra lại');
    } else {
      setHoTen('');
    }
  };

  const guiDangKy = async (e) => {
    e.preventDefault();
    setMessage('Đang xử lý...');
    const res = await fetch('/api/dang-ky', {
      method: 'POST',
      body: JSON.stringify({ so_danh_bo: soDanhBo, sl_cnv: slCnv, sl_nha_thau: slNhaThau, nhom_phu_trach: nhomPhuTrach }),
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if(res.ok) setMessage("✅ " + data.message);
    else setMessage("❌ LỖI: " + data.error);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>ĐĂNG KÝ SUẤT ĂN SCL</h2>
      <form onSubmit={guiDangKy} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <label style={{ fontWeight: 'bold' }}>Số danh bộ Trưởng nhóm:
          <input type="text" value={soDanhBo} onChange={(e) => kiemTraDanhBo(e.target.value)} required style={{width: '100%', padding: '12px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box'}} />
        </label>

        <label style={{ fontWeight: 'bold' }}>Họ tên:
          <input type="text" value={hoTen} disabled style={{width: '100%', padding: '12px', marginTop: '5px', backgroundColor: '#e9ecef', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', fontWeight: 'bold', color: '#0056b3'}} />
        </label>

        <label style={{ fontWeight: 'bold' }}>Nhóm phụ trách quản lý:
          <select value={nhomPhuTrach} onChange={(e) => setNhomPhuTrach(e.target.value)} style={{width: '100%', padding: '12px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '16px'}}>
            <option value="Cối">1. Cối</option>
            <option value="CBL">2. CBL</option>
            <option value="NBS">3. NBS</option>
            <option value="Lò nung">4. Lò nung</option>
            <option value="NXM">5. NXM</option>
            <option value="WS">6. WS</option>
          </select>
        </label>

        <label style={{ fontWeight: 'bold' }}>Số suất ăn CNV:
          <input type="number" value={slCnv} onChange={(e) => setSlCnv(Number(e.target.value))} min="0" style={{width: '100%', padding: '12px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box'}}/>
        </label>

        <label style={{ fontWeight: 'bold' }}>Số suất ăn Nhà thầu:
          <input type="number" value={slNhaThau} onChange={(e) => setSlNhaThau(Number(e.target.value))} min="0" style={{width: '100%', padding: '12px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box'}}/>
        </label>

        <button type="submit" style={{ padding: '15px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginTop: '10px' }}>
          XÁC NHẬN CHỐT SỐ LƯỢNG
        </button>
      </form>
      {message && <p style={{marginTop: '20px', padding: '15px', backgroundColor: message.includes('LỖI') ? '#f8d7da' : '#d4edda', color: message.includes('LỖI') ? '#721c24' : '#155724', borderRadius: '5px', fontWeight: 'bold', textAlign: 'center'}}>{message}</p>}
    </div>
  );
}
