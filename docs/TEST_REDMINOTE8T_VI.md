# Hướng dẫn kiểm thử V2Ray-Magic trên Redmi Note 8T

**Dành cho:** Redmi Note 8T, MIUI 12.5.5, Android 11, máy đã root bằng Magisk.

## Trước khi cài

- Dùng MT Manager sao lưu toàn bộ thư mục `/data/adb/magic_v2ray` sang thư mục an toàn.
- Ghi lại phiên bản module đang chạy. Không cài đè các bản thử nghiệm khi chưa sao lưu.
- Đảm bảo có thể mở Magisk để vô hiệu hóa module nếu kết nối mạng bất thường.
- Cài ZIP `*-arm64-v8a.zip` trực tiếp qua Magisk, sau đó khởi động lại.

## Kiểm thử V1 — 4G, TUN, DNS

1. Tắt proxy trong WebUI. Bật 4G và xác minh duyệt web trực tiếp được.
2. Mở **Chẩn đoán mạng**, kiểm tra IPv4 uplink, Xray và TUN.
3. Chọn node đang hoạt động, bật Xray; kiểm tra truy cập web và địa chỉ IP qua nút trạng thái.
4. Chuyển Wi-Fi → 4G → Wi-Fi, mỗi lần thử truy cập web và gọi ứng dụng.
5. Tắt Xray, xác minh 4G vẫn truy cập Internet; không được yêu cầu khởi động lại để phục hồi.
6. Thử nhập một node lỗi hoặc cấu hình JSON sai; WebUI phải giữ cấu hình Xray trước đó và hiển thị lỗi, không được làm mất 4G.

## Kiểm thử V2 — WebUI

- Dashboard tải lên/xuống, nút Start/Stop, chuyển tab, tiếng Việt, thông báo lỗi.
- Tab Chẩn đoán mạng hoạt động và không chứa nội dung node, UUID, mật khẩu.
- Chế độ cuộn trên màn hình nhỏ không bị khựng kéo dài.

## Kiểm thử V3 — Hotspot

1. Bật điểm phát Wi-Fi và kết nối một thiết bị thứ hai.
2. Vào **Thiết bị Hotspot**, làm mới và xác nhận đúng IP/MAC.
3. Chặn thiết bị rồi bỏ chặn; xác nhận **4G trên điện thoại vẫn dùng được**.
4. Thử giới hạn tải xuống trong điều kiện mạng cho phép. Nếu kernel không hỗ trợ HTB, UI cần thông báo không hỗ trợ.
5. Thử quota nhỏ (ví dụ 5 MiB) và quan sát trên thiết bị thử nghiệm, không dùng làm hạn mức tính cước.
6. Tắt Hotspot rồi bật lại, làm mới và xác minh các rule chỉ áp dụng cho giao diện AP.

**Hạn chế:** giới hạn dung lượng phụ thuộc `xt_quota2`; giới hạn tốc độ chỉ cho chiều tải xuống và phụ thuộc `tc`. Hardware tether offload trên MIUI có thể khiến bộ đếm không đầy đủ. Không đảm bảo quota tồn tại sau khi reboot.

## Kiểm thử V4 — Game và Proxy

- Test node bằng chế độ kiểm tra có sẵn; bật/tắt Game Mode.
- Chạy Liên Quân và PUBG, đo ping, mất gói trong nhiều trận thay vì chỉ nhìn một lần.
- Thử cập nhật subscription đã lưu và kiểm tra không mất node khi nguồn trả lỗi.
- Kiểm tra cài đặt tự cập nhật subscription khi mở WebUI sau 24 giờ.

## Nếu 4G mất

1. **Dừng Xray** trong WebUI; vào Chẩn đoán mạng kiểm tra lại tình trạng.
2. Nếu chưa phục hồi, **tắt module trong Magisk**, khởi động lại điện thoại và kiểm tra 4G.
3. Khi gửi log để sửa lỗi, chỉ cung cấp báo cáo Chẩn đoán mạng và dòng lỗi, **che UUID, token, link subscription riêng tư, IP quản trị VPS**.

> GitHub CI chỉ xác nhận cú pháp, logic tĩnh, công đoạn build và file ZIP. Chỉ kiểm thử trên thiết bị thật mới xác nhận được độ ổn định 4G, DNS và cơ chế Hotspot.
