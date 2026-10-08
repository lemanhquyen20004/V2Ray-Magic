# V2Ray-Magic

**Module Xray Proxy trong suốt dành cho Android đã root**, có WebUI, quản lý Hotspot và các cơ chế xử lý sự cố mạng.

[English](README.md) · [Tải bản phát hành](https://github.com/lemanhquyen20004/V2Ray-Magic/releases) · [Lịch sử cập nhật](CHANGELOG.md) · [Báo lỗi](https://github.com/lemanhquyen20004/V2Ray-Magic/issues)

| Thông tin | Chi tiết |
| --- | --- |
| Phiên bản hiện tại | **v0.0.4** (Magisk `versionCode=172`) |
| Xray-core | **v26.9.30** |
| Chủ dự án / người bảo trì | **[lemanhquyen20004](https://github.com/lemanhquyen20004)** |
| Nền tảng root | Magisk, KernelSU, APatch (tùy ROM/kernel) |
| Kiến trúc CPU | Android `arm64-v8a`, `x86_64` |
| Giấy phép mã nguồn | **GPL-3.0**, giữ bản quyền hợp pháp của tác giả gốc |

> **Đây là bản thử nghiệm.** GitHub Actions đã kiểm tra mã nguồn và đóng gói ZIP, nhưng chưa chứng minh tất cả chức năng hoạt động ổn định trên mọi điện thoại hoặc ROM MIUI. Hãy sao lưu cấu hình trước khi cài.

## Chức năng chính

### Xray và kết nối mạng

- Định tuyến Proxy toàn hệ thống bằng Xray TUN ở cấp root, hỗ trợ bỏ qua ứng dụng, thiết lập DNS/routing, quản lý node và subscription.
- Kiểm tra cấu hình bằng Xray trước khi áp dụng node mới, lưu cấu hình trước đó và cho phép khôi phục thủ công trong WebUI.
- Cơ chế dọn định tuyến khi khởi động TUN lỗi, cùng watchdog phát hiện Xray ngừng chạy.
- Theo dõi việc đổi Wi-Fi/4G, tùy chọn chia sẻ Proxy qua Hotspot và trang **Chẩn đoán mạng** chỉ đọc.
- Hỗ trợ cấu hình VLESS, VMess, Trojan và các giao thức/kiểu truyền tải khác tùy khả năng của Xray-core và bộ chuyển đổi cấu hình.

### WebUI tiếng Việt

- Bảng điều khiển theo dõi tốc độ tải xuống/tải lên và tổng dữ liệu của giao diện mạng Android. **Đây không phải thống kê dung lượng riêng từng node.**
- Quản lý node, kiểm tra độ trễ, xem log Xray, chỉnh sửa cấu hình và bật/tắt Game Mode.
- Cập nhật subscription thủ công; có tùy chọn kiểm tra lại khi mở WebUI sau 24 giờ. **Không phải tác vụ tự cập nhật chạy nền liên tục.**
- Game Mode thay đổi quy tắc chặn UDP/443 mặc định; **không bảo đảm ping thấp** và chưa phải bộ tối ưu chuyên biệt cho Liên Quân/PUBG.

### Hotspot Manager — thử nghiệm

- Hiển thị thiết bị phát hiện được từ bảng IP/ARP/neighbor của Android.
- Chặn hoặc bỏ chặn truy cập Internet được chuyển tiếp của thiết bị Hotspot theo địa chỉ IP.
- Tùy chọn **giới hạn dung lượng theo phiên** bằng `xt_quota2` khi kernel hỗ trợ; hiển thị dữ liệu đã dùng nếu kernel có bộ đếm.
- Tùy chọn **giới hạn tốc độ tải xuống** bằng `tc` HTB/U32 khi được hỗ trợ. **Chưa có giới hạn tốc độ tải lên.**

**Giới hạn cần biết:** một số điện thoại không cung cấp đầy đủ danh sách thiết bị hoặc dùng tăng tốc tethering làm lệch bộ đếm; `xt_quota2` và `tc` có thể không hoạt động trên MIUI. Địa chỉ IP có thể thay đổi khi thiết bị kết nối lại. Hạn mức có thể reset sau khi khởi động hoặc làm lại rule — **không phù hợp để tính cước hoặc bảo đảm quota theo ngày**.

## Hướng dẫn cài đặt

1. Điện thoại Android đã root bằng Magisk, KernelSU hoặc APatch.
2. **Sao lưu** thư mục `/data/adb/magic_v2ray` và cấu hình Proxy đang hoạt động.
3. Vào [Releases mới nhất](https://github.com/lemanhquyen20004/V2Ray-Magic/releases/latest), chọn ZIP:
   - **`arm64-v8a.zip`**: dành cho phần lớn điện thoại, bao gồm **Redmi Note 8T**.
   - `x86_64.zip`: chỉ dành cho Android x86_64.
   - `universal.zip`: chứa nhiều kiến trúc, dung lượng tải lớn hơn.
4. Trong Magisk chọn **Modules → Install from storage**, chọn file ZIP ở mục **Assets** của Release (không chọn “Source code”), cài xong thì **khởi động lại**.
5. Mở WebUI bằng KernelSU/APatch hoặc công cụ WebUI tương thích cho Magisk, ví dụ KsuWebUIStandalone.
6. Kiểm tra **4G khi Proxy đang tắt**, sau đó bật Xray; thử chuyển Wi-Fi ↔ 4G và phát Hotspot riêng từng bước.

Xem [hướng dẫn kiểm thử dành cho Redmi Note 8T](docs/TEST_REDMINOTE8T_VI.md).

> Giữ nguyên ID module `magic_v2ray` để cập nhật đè lên bản đã cài, không tạo thêm module thứ hai.

## Cập nhật trực tiếp trong Magisk

Repo công khai có file [`update.json`](update.json), được khai báo trong `module.prop`. Khi chủ dự án **phát hành phiên bản mới**, cập nhật `update.json` và tăng `versionCode`, Magisk có thể hiển thị nút **Update / Cập nhật** khi kiểm tra phiên bản. Bạn chỉ cần nhấn cập nhật và khởi động lại, không phải tải ZIP thủ công mỗi lần.

- **Không bảo đảm có thông báo đẩy trên thanh trạng thái.** Việc kiểm tra cập nhật phụ thuộc Magisk.
- Phiên bản **v0.0.1** sử dụng `versionCode=169` để cao hơn bản V2Ray-Magic v1.23.1 trước đây (`versionCode=168`), giúp Magisk nhận diện bản mới.
- Chỉ sửa mã nguồn trên GitHub **chưa đủ** để có bản cập nhật; cần Release mới và cập nhật manifest.

## Khi gặp lỗi

- **Mất 4G:** tắt Xray trong WebUI, mở **Chẩn đoán mạng** và thử Internet. Nếu vẫn lỗi, tắt module trong Magisk rồi khởi động lại.
- **Xray không chạy:** kiểm tra cấu hình và log; dùng nút **Khôi phục cấu hình Xray trước** nếu lỗi xuất hiện sau khi đổi node.
- **Không thấy thiết bị Hotspot:** kết nối lại thiết bị và làm mới; có thể Android chưa ghi nhận thiết bị trong bảng neighbor.
- **Giới hạn tốc độ/dung lượng không hoạt động:** kiểm tra khả năng hỗ trợ `xt_quota2`/`tc` và tình trạng tăng tốc tethering của kernel.

Khi báo lỗi, hãy gửi báo cáo chẩn đoán nhưng **che UUID, mật khẩu, token và link subscription riêng tư**.

[Báo lỗi hoặc đề xuất tính năng trên GitHub](https://github.com/lemanhquyen20004/V2Ray-Magic/issues).

## Chủ dự án, bản quyền và ghi nhận

**V2Ray-Magic do [lemanhquyen20004](https://github.com/lemanhquyen20004) sở hữu repository, bảo trì và phát hành.** © 2026 lemanhquyen20004 áp dụng cho những phần mã mới/cải tiến thuộc quyền sở hữu hợp pháp của chủ dự án. **Quyền sở hữu repository không làm chuyển giao bản quyền mã nguồn gốc.**

Dự án được phát triển từ [Magic V2Ray](https://github.com/vincentng295/Magic_V2Ray), giữ ghi nhận **HuskyDG, vincentng295 và các tác giả đóng góp ban đầu**, theo **GNU GPL-3.0**. Xem [COPYRIGHT.md](COPYRIGHT.md) và [LICENSE](LICENSE).

Xray-core, công cụ TUN, các thành phần bên thứ ba và cơ sở dữ liệu định tuyến giữ giấy phép/bản quyền riêng theo nguồn tương ứng.
