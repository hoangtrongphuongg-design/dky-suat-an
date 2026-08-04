# WEB đăng ký suất ăn

Ứng dụng Next.js dành cho trưởng nhóm đăng ký suất ăn trên điện thoại và quản lý xem tổng hợp trên máy tính.

## Chức năng đã triển khai

- Giao diện đăng ký tối ưu cho điện thoại.
- Tra cứu họ tên theo số danh bộ.
- Một trưởng nhóm có thể đăng ký nhiều nhóm trong cùng ngày.
- Có thể cập nhật nhiều lần trước giờ khóa; lần sau thay thế số liệu của đúng nhóm đó.
- Lưu lịch sử giá trị trước/sau cho từng lần cập nhật.
- Dashboard có mã xem 4 chữ số, phiên xem 8 giờ.
- Dashboard có KPI, biểu đồ nhóm, tỷ lệ CNV/nhà thầu, chi tiết và lịch sử.
- Lọc theo khoảng ngày, tìm kiếm và xuất CSV mở trực tiếp bằng Excel.
- Xử lý ngày theo múi giờ `Asia/Ho_Chi_Minh`.
- Kiểm tra dữ liệu phía API và giới hạn tần suất cơ bản.

## 1. Chuẩn bị Neon

Mở **Neon > SQL Editor**, chạy toàn bộ file:

```text
database/migration.sql
```

Sau đó kiểm tra bảng `nhan_vien` đã có dữ liệu. Ví dụ:

```sql
INSERT INTO nhan_vien (so_danh_bo, ho_ten)
VALUES ('0258', 'Nguyễn Văn Phương')
ON CONFLICT (so_danh_bo)
DO UPDATE SET ho_ten = EXCLUDED.ho_ten;
```

## 2. Biến môi trường

Sao chép `.env.example` thành `.env.local` khi chạy tại máy, hoặc khai báo trong **Vercel > Project Settings > Environment Variables**:

- `DATABASE_URL`: chuỗi kết nối Neon.
- `DASHBOARD_PIN`: mã bí mật đúng 4 chữ số.
- `DASHBOARD_SECRET`: chuỗi ngẫu nhiên tối thiểu 32 ký tự.
- `REGISTRATION_CUTOFF`: giờ khóa theo Việt Nam, dạng `HH:mm`; có thể để trống khi chạy thử.

Có thể tạo chuỗi bí mật bằng Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Chạy tại máy

```bash
npm install
npm run dev
```

Mở:

- Trang đăng ký: `http://localhost:3000`
- Dashboard: `http://localhost:3000/dashboard`

## 4. Triển khai Vercel

1. Đưa source lên GitHub.
2. Import repository vào Vercel.
3. Khai báo đủ biến môi trường.
4. Deploy.
5. Kiểm tra đăng ký thử và dashboard trước khi gửi đường link cho các trưởng nhóm.

## Lưu ý vận hành

- Nút “Xuất Excel” tạo file CSV UTF-8 phân tách bằng dấu chấm phẩy; Microsoft Excel mở trực tiếp được và giữ tiếng Việt.
- Rate limit hiện lưu trong bộ nhớ của từng Vercel instance, phù hợp giai đoạn chạy thử. Khi đưa vào quy mô lớn nên chuyển sang Redis/Upstash.
- Không ghi `DASHBOARD_PIN`, `DASHBOARD_SECRET` hoặc `DATABASE_URL` trực tiếp vào source.
- Chưa có trang quản trị danh mục nhân viên; dữ liệu nhân viên vẫn nhập thủ công trên Neon như quy trình hiện tại.
