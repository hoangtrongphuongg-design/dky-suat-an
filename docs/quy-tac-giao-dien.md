# Quy tắc thiết kế giao diện — tránh lỗi hiển thị lặp lại

Tài liệu này đúc kết từ các lần chỉnh sửa giao diện thực tế của dự án "Đăng ký suất ăn". Copy nội dung này vào các dự án web khác (dán vào `CLAUDE.md` của dự án đó, hoặc gửi lại cho Claude khi bắt đầu làm giao diện) để AI tự áp dụng ngay từ đầu, đỡ phải góp ý sửa đi sửa lại.

## 1. Không bao giờ để trang có thanh cuộn ngang

- Nguyên tắc gốc: **không phần tử nào được có chiều rộng cố định vượt quá khung chứa**. Hẹp thì phải tự co lại / tự xuống dòng, không được đẩy layout rộng ra ngoài.
- Đừng chỉ nghĩ tới màn hình điện thoại. Trên máy tính, nếu layout có nhiều cột (sidebar + nội dung, hoặc 2 khối cạnh nhau), một khối có thể **hẹp hơn cả điện thoại** khi thu nhỏ cửa sổ hoặc ở độ phân giải laptop phổ biến (1280–1366px). Luôn test cả trường hợp khung hẹp do bố cục nhiều cột, không chỉ test theo bề rộng màn hình.

## 2. Bảng dữ liệu (table)

**Đừng chia % cột cố định rồi cắt chữ bằng ellipsis.** Cách này luôn phải chỉnh tay lại mỗi khi nội dung đổi, và dễ cắt mất chữ (kể cả tiêu đề cột) một cách khó lường.

Cách đúng — để bảng tự co giãn theo nội dung thật, chữ dài thì xuống dòng thay vì bị ẩn:

```css
.table-wrap table { table-layout: auto; width: 100%; }
.table-wrap th { white-space: nowrap; }           /* tiêu đề cột KHÔNG BAO GIỜ xuống dòng/vỡ chữ */
.table-wrap td { white-space: normal; overflow-wrap: break-word; } /* nội dung dài thì xuống dòng nguyên từ */
```

Vài điểm quan trọng rút ra:
- **Dùng `overflow-wrap: break-word`, KHÔNG dùng `word-break: break-word`.** `word-break: break-word` cho phép trình duyệt cắt ngang bất kỳ từ nào kể cả khi không cần (ví dụ chữ "Muộn" bị tách thành "M" / "uộn"). `overflow-wrap: break-word` chỉ cắt khi cả một từ dài hơn cả dòng trống — ưu tiên xuống dòng nguyên từ trước.
- **`th` phải `white-space: nowrap`.** Nếu để tiêu đề tự xuống dòng, `table-layout: auto` sẽ không chừa đủ chỗ cho tiêu đề và cột bị bóp quá hẹp, gây vỡ chữ.
- Cột nào chỉ có 1-2 từ ngắn cố định (badge trạng thái, nút hành động) thì không cần lo — chỉ áp dụng kỹ với cột chứa văn bản dài, biến thiên (họ tên, ghi chú...).
- Nếu vẫn muốn hiển thị đủ thông tin dài (VD: ngày giờ đầy đủ thay vì rút gọn) — cứ để nguyên, đừng rút gọn label để "tiết kiệm chỗ". Rút gọn label chỉ nên là biện pháp cuối, ưu tiên để layout tự co giãn trước.

**Trên điện thoại:** khi bảng có nhiều cột (>5-6 cột), đổi hẳn sang dạng danh sách thẻ xếp dọc (mỗi dòng = 1 thẻ, mỗi ô = "nhãn: giá trị") thay vì bắt người dùng cuộn ngang:

```css
@media (max-width: 700px) {
  .table-wrap table, .table-wrap thead, .table-wrap tbody,
  .table-wrap th, .table-wrap td, .table-wrap tr { display: block; }
  .table-wrap thead { display: none; }
  .table-wrap tr { margin-bottom: 10px; border: 1px solid #eee; border-radius: 12px; padding: 4px 12px; }
  .table-wrap td { display: flex; justify-content: space-between; gap: 10px; padding: 7px 0; text-align: right; }
  .table-wrap td[data-label]::before { content: attr(data-label); color: #98a2b3; font-size: 9px; font-weight: 800; text-transform: uppercase; }
}
```
(Cần thêm `data-label="Tên cột"` vào từng `<td>` trong JSX/HTML để CSS trên hoạt động.)

## 3. Widget nằm trong layout nhiều cột (biểu đồ, card...)

Nếu một khối (VD: biểu đồ) nằm cạnh khối khác trong bố cục nhiều cột trên desktop, bề rộng THẬT của nó phụ thuộc layout cha, không phải bề rộng màn hình. Dùng `@container` thay vì `@media` để nó tự đổi bố cục đúng theo bề rộng khung chứa thật sự, ở mọi kích thước màn hình:

```css
.chart-card { container-type: inline-size; }
@container (max-width: 560px) {
  /* đổi bố cục khi khung chứa hẹp hơn 560px, bất kể màn hình to hay nhỏ */
}
```

## 4. Màu sắc / badge: đừng lạm dụng

- Chữ phân loại đơn giản (VD: cột "Loại") → ưu tiên **chữ thường, cùng font/cỡ với các cột khác**, không cần khung màu (badge) trừ khi thực sự cần gây chú ý.
- Chỉ dùng khung màu/nổi bật cho thông tin **thật sự cần gây chú ý ngay** (ví dụ: nhãn "Muộn", ngày hiện tại của báo cáo nhanh, cảnh báo).
- Khi cần nổi bật: tăng cỡ chữ + in đậm + màu nhấn, có thể thêm nền nhạt — nhưng vẫn giữ gọn, không phá vỡ layout xung quanh.

## 5. Căn chỉnh & bố cục

- Bảng số liệu: căn giữa (`text-align: center`) cho gọn gàng, cân đối — trừ khi nội dung là văn bản dài (đoạn ghi chú) thì căn trái dễ đọc hơn.
- Card/khối hiển thị số liệu (KPI, tổng số...) nên **co theo đúng nội dung** (`flex; width: fit-content` hoặc `flex: 0 1 auto` + `min-width`), không kéo giãn hết chiều ngang một cách vô nghĩa nếu nội dung ngắn.
- Nút hành động (Xuất Excel, Thêm mới, Làm mới...) nên nhóm gần khu vực dữ liệu/số liệu liên quan, không tách rời quá xa khỏi ngữ cảnh của chúng.

## 6. Checklist trước khi báo "xong giao diện"

- [ ] Thu nhỏ cửa sổ trình duyệt dần từ rộng → hẹp (bao gồm cả khoảng desktop hẹp, ~1024–1280px) → không có lúc nào xuất hiện thanh cuộn ngang.
- [ ] Xem trên khổ điện thoại thật (hoặc devtools responsive) — bảng/danh sách đọc được, không cần cuộn ngang.
- [ ] Không có tiêu đề cột hay nhãn ngắn nào bị cắt/vỡ chữ giữa từ.
- [ ] Nội dung dài (tên, ghi chú...) xuống dòng gọn gàng, không bị ẩn mất bởi dấu "...".
- [ ] Nội dung quan trọng cần chú ý (ngày, cảnh báo, trạng thái đặc biệt) có nổi bật hơn nội dung phụ.
