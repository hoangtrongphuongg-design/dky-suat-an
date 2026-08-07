# Prompt dùng cho các dự án khác

Dán nguyên đoạn dưới đây vào Claude Code khi mở ở dự án khác. Sau khi chạy xong ở vài dự án, gửi lại cho mình các mục "Ghi chú riêng cho dự án này" từ mỗi dự án (nếu có) để mình gộp thành 1 bộ quy tắc chung cuối cùng cho tất cả.

---

```
Rà soát toàn bộ giao diện web trong dự án này (đặc biệt các bảng dữ liệu,
danh sách, biểu đồ, card hiển thị số liệu) và áp dụng bộ quy tắc sau — đây
là các quy tắc đã rút ra từ một dự án trước, phải sửa lỗi nhiều lần mới ra
được, giờ muốn áp dụng luôn từ đầu để đỡ mất thời gian sửa qua lại:

1. Không bao giờ để trang có thanh cuộn ngang — kể cả trên desktop khi bố
   cục có nhiều cột (một khối có thể hẹp hơn cả điện thoại ở độ phân giải
   laptop ~1024–1366px). Test bằng cách thu nhỏ cửa sổ trình duyệt dần từ
   rộng xuống hẹp, không chỉ test theo kích thước điện thoại.

2. Bảng dữ liệu (table): dùng table-layout: auto, th { white-space: nowrap },
   td { white-space: normal; overflow-wrap: break-word }. KHÔNG chia %
   cột cứng rồi cắt chữ bằng ellipsis làm cách chính — cách đó phải chỉnh
   tay liên tục mỗi khi nội dung đổi, và hay cắt mất chữ kể cả tiêu đề cột.

3. Không dùng word-break: break-word (cắt vỡ giữa từ không cần thiết, ví
   dụ "Muộn" bị tách "M"/"uộn") — dùng overflow-wrap: break-word (chỉ cắt
   khi một từ dài hơn cả một dòng trống, ưu tiên xuống dòng nguyên từ).

4. Bảng nhiều cột trên điện thoại (≤~700px): chuyển sang dạng thẻ xếp dọc
   (mỗi dòng = 1 thẻ, mỗi ô = "nhãn: giá trị", dùng data-label + ::before),
   không dựa vào cuộn ngang.

5. Widget/card nằm trong bố cục nhiều cột (biểu đồ cạnh card khác, sidebar +
   nội dung...): dùng @container (container-type: inline-size trên khối
   cha) thay vì @media — vì bề rộng thật của nó phụ thuộc layout cha chứ
   không phải bề rộng màn hình.

6. Hạn chế màu mè/badge — chữ thường là mặc định, chỉ tô màu/làm nổi bật
   thông tin THẬT SỰ cần chú ý ngay (cảnh báo, ngày hiện tại của báo cáo,
   trạng thái đặc biệt...). Các cột phân loại thông thường thì để chữ
   thường, cùng font/cỡ với các cột khác.

7. Ưu tiên hiển thị đầy đủ nội dung (không rút gọn/viết tắt nhãn) trừ khi
   thật sự cần thiết — để layout tự co giãn (xuống dòng, auto-size) giải
   quyết vấn đề thiếu chỗ trước, rút gọn chữ chỉ nên là biện pháp cuối.

8. Bảng số liệu: căn giữa (text-align: center) cho gọn gàng, cân đối. Văn
   bản dài (ghi chú, mô tả...) thì căn trái cho dễ đọc.

Việc cần làm:
1. Tìm tất cả bảng (table), danh sách dạng lưới, card số liệu, biểu đồ
   trong dự án.
2. Đối chiếu với 8 quy tắc trên, liệt kê những chỗ đang vi phạm.
3. Sửa trực tiếp các lỗi tìm được (ưu tiên bảng dữ liệu và các khối có khả
   năng gây cuộn ngang trước).
4. Sau khi sửa xong, viết/cập nhật file docs/quy-tac-giao-dien.md trong dự
   án này: giữ nguyên 8 quy tắc trên, bổ sung thêm mục "Ghi chú riêng cho
   dự án này" nếu phát hiện tình huống đặc thù không nằm trong 8 quy tắc
   gốc (ví dụ: loại bảng lạ, thư viện UI riêng, framework CSS khác...).
5. Báo cáo ngắn gọn: đã sửa gì, còn gì cần tôi tự xem lại bằng mắt (vì
   không có quyền truy cập trình duyệt để xem trước kết quả).
```
