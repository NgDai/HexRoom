# Quy chuẩn nghiệp vụ HexRoom (HexRoom Business Rules)

Tài liệu quy chuẩn nghiệp vụ của nền tảng HexRoom, được đối chiếu chặt chẽ theo tài liệu định hướng (`HexRoom idea.md`), hiện trạng source code và các kịch bản kiểm thử chấp nhận.

---

## 1. Mô hình vai trò người dùng (User Roles & Permissions)

| Vai trò (UserRole) | Mô tả trách nhiệm | Quyền hạn chính | Giới hạn & Bất biến (Invariants) |
|---|---|---|---|
| `ADMIN` | Quản trị viên tối cao | Toàn quyền quản trị hệ thống, người dùng, phòng, phê duyệt, phân công, cấu hình gói | Không thể tự cấp quyền ADMIN qua API đăng ký công khai (`/api/auth/register`). |
| `MODERATOR` | Kiểm duyệt viên nội dung | Duyệt tin đăng (`Rental`, `Room`), xử lý báo cáo vi phạm, phân công kiểm định | Không thể sở hữu hoặc can thiệp trái phép hồ sơ riêng tư của người dùng khác. |
| `INSPECTOR` | Kiểm định viên thực địa | Tiếp nhận lịch khảo sát, kiểm tra hiện trường, lập biên bản đối chiếu 4 hạng mục kèm ảnh bằng chứng | **Tuyệt đối không được tự kiểm tra phòng thuộc sở hữu của chính mình** (`ForbiddenException`). |
| `LANDLORD` | Chủ nhà / Bên cho thuê | Đăng bài (`Rental`), tạo và quản lý phòng (`Room`), yêu cầu kiểm định, xác nhận còn phòng | Chỉ được sửa/xóa phòng và nhà trọ do chính tài khoản mình sở hữu. |
| `TENANT` | Người thuê trọ / Tìm phòng | Tìm kiếm phòng, lưu yêu thích, tạo hồ sơ ở ghép, gửi lời mời kết nối ghép phòng | Không được duyệt tin, không được tự tạo kết quả kiểm tra đối chiếu. |
| `GUEST` | Khách vãng lai chưa đăng nhập | Xem danh sách phòng đã duyệt, xem chi tiết phòng, xem hồ sơ ở ghép công khai tối thiểu | Không được xem danh bạ (email/phone), không được upload file, không được chat. |

---

## 2. Quy chuẩn Bất động sản: Tòa nhà (Rental) và Phòng (Room)

1. **Phân biệt ranh giới**:
   - `Rental`: Đại diện cho tòa nhà/căn nhà trọ, vị trí địa lý (tỉnh/thành, quận/huyện, địa chỉ), chủ sở hữu (`owner`), giấy tờ pháp lý tòa nhà.
   - `Room`: Đại diện cho một đơn vị phòng ở cụ thể thuộc tòa nhà, có diện tích (`sizeM2`), giá thuê (`price`), chi phí chi tiết (`RoomCosts`), nội thất và ảnh phòng.
2. **Quy tắc hiển thị công khai (Public Visibility Rule)**:
   - Một phòng chỉ được phép hiển thị trên API tìm kiếm công khai (`GET /api/rooms`, `GET /api/rooms/{id}`) khi và chỉ khi **CẢ HAI** điều kiện sau thỏa mãn:
     $$\text{Room.status} == \text{AVAILABLE} \quad \land \quad \text{Rental.status} == \text{AVAILABLE}$$
   - Bất kỳ trạng thái nào khác (`PENDING`, `REJECTED`, `RENTED`, `MAINTENANCE`) sẽ trả về `404 Not Found` đối với người dùng công khai hoặc tenant.
3. **Hiệu ứng khi chỉnh sửa phòng (Mutation Side-effects)**:
   - Khi chủ nhà sửa bất kỳ thông tin phòng nào qua `PUT /api/rooms/{id}`:
     - `room.status` tự động bị hạ về `RoomStatus.PENDING` (chờ duyệt lại).
     - `room.availabilityConfirmedAt` bị đặt về `null` (hủy xác nhận còn phòng).
     - `room.informationChangedAt` được cập nhật thành thời điểm hiện tại `LocalDateTime.now()`.
     - Toàn bộ hồ sơ kiểm định cũ chuyển trạng thái hiển thị thành `NEEDS_UPDATE` (cần đối chiếu lại) nhưng **vẫn giữ nguyên lịch sử và kết luận gốc**.

---

## 3. Quy chuẩn Chi phí & Giá cả (Costs & Fees Invariant)

1. **Phân biệt `null` (chưa xác định) và `0` (miễn phí)**:
   - Các trường trong `RoomCosts` (`deposit`, `electricityPerKwh`, `waterPerM3`, `internetMonthly`, `parkingMonthly`, `serviceMonthly`):
     - `null`: Chủ nhà chưa cung cấp thông tin $\rightarrow$ Hiển thị "Chưa xác định" hoặc "Thương lượng", **tuyệt đối không tự động biến thành 0**.
     - `0`: Chủ nhà cam kết miễn phí $\rightarrow$ Hiển thị "Miễn phí".
   - Giá trị số không bao giờ được phép âm (validation `@DecimalMin("0.0")`).
2. **Chính sách Tiền cọc (Deposit Policy)**:
   - HexRoom trong giai đoạn MVP **hoàn toàn KHÔNG đứng ra giữ cọc hay làm trung gian thu hộ tiền thuê**.
   - Tiền cọc hiển thị trên tin đăng là mức cọc chủ nhà yêu cầu tenant đóng trực tiếp khi ký hợp đồng.
   - Endpoint `GET /api/preorders/mine` trả về danh sách rỗng để bảo toàn hợp đồng API mà không kích hoạt luồng giữ cọc giả tạo.

---

## 4. Quy chuẩn Kiểm định thực địa & Đối chiếu 4 hạng mục

1. **4 Hạng mục kiểm tra độc lập (`Category`)**:
   - `CONDITION`: Hiện trạng vật lý, công trình, thấm dột, mùi hôi, độ thông thoáng, thiết bị hoạt động.
   - `PRICE_AND_FEES`: Đối chiếu bảng giá thuê, tiền cọc, biểu giá điện, nước, internet, phí dịch vụ thực tế.
   - `IMAGES`: Đối chiếu góc chụp ảnh, độ chân thực, kích thước thực tế so với ảnh quảng cáo.
   - `RENTAL_RIGHTS`: Kiểm tra quyền cho thuê hợp pháp của chủ nhà (sổ hồng, hợp đồng ủy quyền, giấy phép kinh doanh).
2. **5 Trạng thái đối chiếu (`Result`)**:
   - `CHECKED`: Đã đối chiếu thực tế đạt chuẩn. Bắt buộc phải có ngày hết hạn (`validUntil`) và ảnh bằng chứng (`evidenceImages`).
   - `NOT_CHECKED`: Chưa tiến hành đối chiếu hạng mục này.
   - `NEEDS_UPDATE`: Đã từng kiểm tra nhưng phòng đã thay đổi thông tin hoặc quá hạn kiểm tra định kỳ (6 tháng).
   - `UNDER_REVIEW`: Đang trong quá trình tiếp nhận và đối chiếu thực địa hoặc đang giải quyết khiếu nại.
   - `DISCREPANCY_CONFIRMED`: Đã xác nhận sai lệch thực tế sau quá trình kiểm tra. Bắt buộc có biên bản và ảnh bằng chứng.
3. **Quy tắc bảo toàn lịch sử**:
   - Kết quả kiểm định không bao giờ bị ghi đè mất dấu. Mỗi lần kiểm định là một bản ghi `RoomInspection` bất biến gắn với `inspectorId` và `recordedAt`.

---

## 5. Quy chuẩn Tìm bạn ở ghép (Roommate 2-Person Matching)

1. **Rào cản bắt buộc (Hard Constraints - Loại ngay nếu vi phạm)**:
   - Cả 2 hồ sơ phải bật công khai (`visible == true`).
   - Cùng tỉnh/thành phố (`city.equalsIgnoreCase(...)`).
   - Khoảng ngân sách cá nhân có giao nhau:
     $$\text{minA} \le \text{maxB} \quad \land \quad \text{minB} \le \text{maxA}$$
   - Tiêu chí hút thuốc hai chiều (Mutual smoking match):
     $$\text{isSmoking(A)} \implies \text{acceptSmoking(B)} \quad \land \quad \text{isSmoking(B)} \implies \text{acceptSmoking(A)}$$
   - Tiêu chí thú cưng hai chiều (Mutual pet match):
     $$\text{hasPets(A)} \implies \text{acceptPets(B)} \quad \land \quad \text{hasPets(B)} \implies \text{acceptPets(A)}$$
   - Khoảng cách ngày dự kiến chuyển vào chênh lệch không quá 30 ngày:
     $$|\text{moveInDate(A)} - \text{moveInDate(B)}| \le 30 \text{ ngày}$$
2. **Bảo vệ quyền riêng tư (Privacy & Redaction Invariant)**:
   - Danh sách gợi ý (`GET /api/roommates/suggestions`) và xem hồ sơ công khai (`GET /api/roommates/profile/{id}`): **Email và Số điện thoại tuyệt đối bị ẩn (`null`)**.
   - Chỉ khi hai bên đã gửi lời mời và được chấp nhận (`RoommateConnection.Status == ACCEPTED`), hoặc khi người dùng tự xem hồ sơ của chính mình, thông tin liên hệ mới được hiển thị.
   - Không tự tiện mở kênh chat khi chưa có sự đồng ý của cả 2 bên.

---

## 6. Quy chuẩn Quản lý Media & Cloudinary Lifecycle

1. **Xác thực bắt buộc**:
   - Tuyệt đối không cho phép khách vãng lai gọi POST `/api/upload/**`. Mọi thao tác tải file lên máy chủ hoặc Cloudinary đều phải được chứng thực (`.authenticated()`).
2. **Kiểm tra MIME type & Giới hạn dung lượng**:
   - Ảnh: Chỉ chấp nhận `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Kích thước tối đa: **10 MB**.
   - Tài liệu/CCCD: Chấp nhận ảnh và `application/pdf`. Kích thước tối đa: **20 MB**.
   - Chặn tuyệt đối các file có đuôi thực thi hoặc mã độc: `.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.js`, `.jsp`, `.jar`, `.vbs`, `.msi`.
3. **Cơ chế bồi hoàn (Compensation Hook)**:
   - Nếu việc lưu dữ liệu vào PostgreSQL thất bại sau khi ảnh đã được upload lên Cloudinary, phương thức `compensateUpload(publicId)` được kích hoạt để dọn dẹp tài nguyên mồ côi, tránh thất thoát dung lượng lưu trữ đám mây.
