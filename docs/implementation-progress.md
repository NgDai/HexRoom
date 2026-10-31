# Tiến độ triển khai dự án HexRoom (Implementation Progress)

Tài liệu ghi nhận tiến độ triển khai, các hạng mục đã hoàn thành, lỗi đã xử lý, và các bước tiếp theo phục vụ việc tiếp quản dự án mà không bị đứt đoạn.

---

## 1. Nhật ký phiên làm việc (Session Changelog)

| Thời điểm | Module / Thành phần | Thay đổi thực hiện | Trạng thái |
|---|---|---|---|
| **2026-10-31** | `SecurityConfig.java` | Khắc phục lỗi thứ tự Matcher: Di chuyển các matcher phân quyền role (`/api/rooms/manage`, `/api/rentals/mine`) lên trước wildcard công khai `GET /api/rooms/**`. Yêu cầu chưa đăng nhập trả về đúng HTTP 401 thay vì 403. | **Đã hoàn thành & Đã kiểm chứng** |
| **2026-10-31** | `RoommateService.java`, `RoommateController.java` | Khắc phục rò rỉ dữ liệu cá nhân (Privacy Leak): Ẩn hoàn toàn Email và Số điện thoại trong danh sách gợi ý (`suggestions`) và xem hồ sơ công khai (`profile/{id}`) của người lạ. Chỉ mở khi hai bên đã có kết nối `ACCEPTED`. | **Đã hoàn thành & Đã kiểm chứng** |
| **2026-10-31** | `CloudinaryService.java`, `UploadController.java`, `SecurityConfig.java` | Hoàn thiện vòng đời Media & Bảo mật tải file: Bắt buộc đăng nhập (`.authenticated()`) cho endpoint `/api/upload/**`, siết phân quyền `/rental-image`, kiểm tra định dạng MIME (JPEG, PNG, WebP, PDF), giới hạn dung lượng (10MB ảnh, 20MB tài liệu), chặn mã độc thực thi, bổ sung hook `compensateUpload` dọn dẹp ảnh mồ côi. | **Đã hoàn thành & Đã kiểm chứng** |
| **2026-10-31** | `HexRoomApiSecurityTest.java`, `HexRoomCoreTest.java` | Bổ sung kiểm thử hồi quy và an ninh: Kiểm tra bảo vệ endpoint upload (401 unauth, 403 tenant), kiểm tra ẩn/hiện thông tin liên lạc người ở ghép, kiểm tra bộ lọc MIME và dung lượng Cloudinary. | **Đã hoàn thành & Đã kiểm chứng** |
| **2026-10-31** | `docs/*`, `.env.example`, `README.md` | Lập bộ tài liệu bàn giao chuẩn hóa: `business-rules.md`, `implementation-audit.md`, `implementation-progress.md`, `test-report.md`, `.env.example`. | **Đã hoàn thành** |

---

## 2. Trạng thái các Module cốt lõi

### A. Tài khoản & Phân quyền (`auth`, `security`)
- **Đã kiểm chứng**: Đăng nhập, đăng ký (`TENANT`, `LANDLORD`), refresh token qua HttpOnly Cookie, bảo vệ không cho tự nâng role `ADMIN`/`MODERATOR`, khóa tài khoản `SUSPENDED` bị từ chối ngay lập tức.
- **Bảo mật đối tượng (Object-level)**: Chủ nhà chỉ sửa/xóa được phòng của chính mình (`checkOwnership`). Nhân viên không được tự kiểm tra phòng mình sở hữu.

### B. Nhà trọ & Phòng (`rentals`, `rooms`)
- **Đã kiểm chứng**: Phân biệt tòa nhà (`Rental`) và phòng (`Room`). Phòng công khai đòi hỏi cả 2 đều `AVAILABLE`.
- **Đã kiểm chứng**: Khi sửa phòng, trạng thái trở lại `PENDING`, xóa xác nhận còn phòng (`availabilityConfirmedAt = null`), đánh dấu `informationChangedAt = now()`.
- **Đã kiểm chứng**: Phí chưa biết giữ nguyên `null`, phí miễn phí giữ `0`. Giới hạn phân trang tối đa 100 phòng, chặn khoảng giá âm hoặc max < min.

### C. Đối chiếu thực tế 4 hạng mục (`inspections`)
- **Đã kiểm chứng**: 4 hạng mục (`CONDITION`, `PRICE_AND_FEES`, `IMAGES`, `RENTAL_RIGHTS`), 5 trạng thái (`CHECKED`, `NOT_CHECKED`, `NEEDS_UPDATE`, `UNDER_REVIEW`, `DISCREPANCY_CONFIRMED`).
- **Đã kiểm chứng**: Hết hạn hoặc phòng thay đổi nội dung thì `currentResult` tự động chuyển thành `NEEDS_UPDATE` mà không mất lịch sử kiểm định cũ.
- **Đã kiểm chứng**: Phản ánh đang chờ duyệt (`UNDER_REVIEW`) không tự động biến thành gian lận (`DISCREPANCY_CONFIRMED`).

### D. Tìm bạn cùng phòng 2 người (`roommates`)
- **Đã kiểm chứng**: Lọc điều kiện bắt buộc 2 chiều (ngân sách giao nhau, cùng thành phố, hút thuốc, thú cưng, thời hạn dọn vào trong 30 ngày).
- **Đã kiểm chứng**: Khắc phục lỗ hổng riêng tư: email và điện thoại chỉ hiển thị khi đã kết nối thành công (`ACCEPTED`).

### E. Quản lý tải lên Cloudinary & Media (`upload`, `cloudinary`)
- **Đã kiểm chứng**: Kiểm soát MIME type, chặn đuôi nguy hiểm (`.exe`, `.sh`, `.php`), chặn file quá dung lượng (10MB / 20MB).
- **Đã kiểm chứng**: Bắt buộc đăng nhập; kiểm duyệt viên/chủ nhà mới được upload ảnh nhà trọ. Bổ sung hàm xóa bù `compensateUpload`.

---

## 3. Các hạng mục chờ quyết định / Giai đoạn mở rộng

1. **Quy trình khiếu nại & phúc khảo chuyên sâu**:
   - Hiện đã có cơ chế lưu trữ biên bản và phản ánh. Luồng tối đa 2 lần phúc khảo và phân công kiểm định viên độc lập thứ hai có thể mở rộng thêm bảng `inspection_appeals` khi đưa vào vận hành thực tế quy mô lớn.
2. **Gói cước VIP & Hạn mức tin đăng**:
   - Hiện đã có trường `isVip` và `vipExpiresAt` trên User, cùng các giá trị mẫu trong Seeder. Cơ chế webhook thanh toán (VNPay / MoMo) cần cấu hình merchant thật trước khi bật giao dịch sản xuất.
3. **Mẫu hợp đồng thuê phòng**:
   - Hiện thị trường sử dụng mẫu hợp đồng tham khảo. Cần bộ phận pháp chế rà soát và cấp con dấu thẩm định trước khi gắn nhãn "Đã được phê duyệt pháp lý".
4. **Tìm bạn ở ghép nhóm 3–4 người**:
   - Thuộc giai đoạn 2 sau khi phiên bản matching 2 người hoạt động ổn định.
