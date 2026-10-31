# HexRoom Backend - Java Spring Boot 3 & Cloudinary

Hệ thống backend HexRoom xây dựng trên nền tảng **Java 21 (LTS)** và **Spring Boot 3.3.4**, tích hợp lưu trữ đám mây **Cloudinary**, bảo mật **Spring Security 6 (JWT + HttpOnly Cookie)** và đối chiếu thông tin thực tế 4 hạng mục.

---

## 1. Công nghệ cốt lõi

- **Ngôn ngữ:** Java 21 (LTS)
- **Framework:** Spring Boot 3.3.4
- **ORM / Database:** Spring Data JPA (Hibernate 6) + PostgreSQL Driver (kết nối Supabase / PostgreSQL)
- **Lưu trữ đám mây:** Cloudinary Java SDK (hỗ trợ tự động fallback lưu trữ cục bộ an toàn)
- **Bảo mật:** Spring Security 6 + JJWT (0.12.6) + BCrypt + HttpOnly Cookie
- **Tài liệu API:** Springdoc OpenAPI 2.6.0 (Swagger UI v3)
- **Build tool:** Apache Maven Wrapper (`mvnw` & `mvnw.cmd`)
- **Kiểm thử:** JUnit Jupiter 5, Mockito 5, Spring Test / MockMvc (27/27 bài kiểm thử đạt 100%)

---

## 2. Tài liệu Quy chuẩn & Báo cáo kỹ thuật

Toàn bộ quy chuẩn và tiến độ kiểm thử được lưu trữ tại thư mục `docs/`:
- [`docs/business-rules.md`](file:///c:/Users/PC/Documents/HexRoom/hexroom/docs/business-rules.md): Bất biến nghiệp vụ, phân quyền vai trò, chi phí null vs 0, quy tắc 4 hạng mục kiểm định, matching 2 người, và vòng đời media.
- [`docs/implementation-audit.md`](file:///c:/Users/PC/Documents/HexRoom/hexroom/docs/implementation-audit.md): Bảng đối chiếu thực trạng mã nguồn 8 cột theo mã yêu cầu `REQ-...`.
- [`docs/implementation-progress.md`](file:///c:/Users/PC/Documents/HexRoom/hexroom/docs/implementation-progress.md): Nhật ký phiên làm việc, trạng thái module và các bước tiếp theo.
- [`docs/test-report.md`](file:///c:/Users/PC/Documents/HexRoom/hexroom/docs/test-report.md): Báo cáo chi tiết 27 bài kiểm thử và đối chiếu 11 kịch bản chấp nhận bắt buộc.

---

## 3. Cấu trúc thư mục dự án

```text
HexRoom-backend/
├── .mvn/wrapper/                  # Maven Wrapper files
├── mvnw & mvnw.cmd               # Maven Wrapper script
├── pom.xml                       # Maven dependencies & build configuration
├── .env.example                  # File cấu hình mẫu với placeholder an toàn
├── src/
│   ├── main/
│   │   ├── java/com/hexroom/backend/
│   │   │   ├── HexRoomApplication.java    # Điểm khởi chạy ứng dụng
│   │   │   ├── common/                    # ApiResponse, PagedResponse
│   │   │   ├── config/                    # SecurityConfig, CloudinaryConfig, OpenApiConfig, DataSeeder
│   │   │   ├── security/                  # JwtTokenProvider, JwtAuthenticationFilter, UserPrincipal
│   │   │   ├── entity/                    # JPA Entities (User, Rental, Room, RoomInspection, RoommateProfile...)
│   │   │   │   └── enums/                 # UserRole, UserStatus, RentalStatus, RoomStatus, RoomType
│   │   │   ├── repository/                # Spring Data JPA Repositories
│   │   │   ├── dto/                       # Request/Response DTOs (auth, rental, room, roommate...)
│   │   │   ├── service/                   # Dịch vụ nghiệp vụ (Auth, Room, Rental, Inspection, Roommate, Cloudinary...)
│   │   │   ├── controller/                # REST Controllers (Auth, Room, Rental, Inspection, Roommate, Upload...)
│   │   │   └── exception/                 # GlobalExceptionHandler, AppException, ResourceNotFound...
│   │   └── resources/
│   │       └── application.yml            # Cấu hình Spring Boot, Database, JWT, Cloudinary
│   └── test/
│       └── java/com/hexroom/backend/
│           ├── HexRoomApiSecurityTest.java # Kiểm thử An ninh API & Phân quyền (MockMvc)
│           └── service/HexRoomCoreTest.java # Kiểm thử Nghiệp vụ lõi, Matching, Invariant, Cloudinary
```

---

## 4. Hướng dẫn Khởi chạy & Kiểm thử

### Bước 1: Cấu hình Môi trường
Sao chép `.env.example` thành `.env` hoặc thiết lập các biến môi trường:
```powershell
cp .env.example .env
```
*(Tham khảo `.env.example` để cấu hình PostgreSQL, JWT Secret, và Cloudinary API credentials)*

### Bước 2: Chạy Kiểm thử Toàn diện (Unit & Slice Tests)
```powershell
cd HexRoom-backend
.\mvnw.cmd test
```
*Tất cả 27 bài kiểm thử an ninh và nghiệp vụ sẽ được thực thi và xác nhận `BUILD SUCCESS`.*

### Bước 3: Khởi chạy Ứng dụng Backend
```powershell
.\mvnw.cmd spring-boot:run
```
Máy chủ sẽ lắng nghe tại cổng `8080` (hoặc cổng cấu hình qua biến `PORT`).

---

## 5. Tài liệu API (Swagger UI)

Khi backend đang chạy:
- **Swagger UI:** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **OpenAPI JSON Spec:** [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

---

## 6. Danh mục API chính

### 6.1. Xác thực & Tài khoản (`/api/auth`)
- `POST /api/auth/register`: Đăng ký tài khoản (`TENANT` hoặc `LANDLORD`).
- `POST /api/auth/login`: Đăng nhập, nhận Access Token (15 phút) và Refresh Token qua Cookie HttpOnly an toàn.
- `POST /api/auth/refresh`: Cấp mới Access Token từ Refresh Token.
- `POST /api/auth/logout`: Thu hồi token và xóa cookie phiên.
- `GET /api/auth/me`: Lấy thông tin tài khoản đang đăng nhập.

### 6.2. Nhà trọ & Bài đăng (`/api/rentals`)
- `GET /api/rentals`: Tìm kiếm bài đăng cho thuê đã duyệt (`AVAILABLE`).
- `GET /api/rentals/{id}`: Chi tiết bài đăng và danh sách phòng thuộc bài đăng.
- `GET /api/rentals/mine`: Danh sách nhà trọ do chính chủ nhà sở hữu.
- `POST /api/rentals`: Đăng tin nhà trọ mới (chủ nhà).
- `PATCH /api/rentals/{id}/status`: Duyệt bài đăng (`MODERATOR`, `ADMIN`).

### 6.3. Phòng trọ (`/api/rooms`)
- `GET /api/rooms`: Tìm kiếm và lọc phòng trọ nâng cao (giá, diện tích, vị trí, từ khóa, sắp xếp ổn định, trần phân trang 100).
- `GET /api/rooms/{id}`: Chi tiết phòng trọ (chỉ hiển thị khi cả Room và Rental đều `AVAILABLE`).
- `GET /api/rooms/manage`: Danh sách quản lý phòng theo quyền hạn người dùng.
- `POST /api/rooms/{id}/confirm-availability`: Chủ nhà xác nhận phòng vẫn còn trống.
- `PUT /api/rooms/{id}`: Chỉnh sửa phòng (tự động hạ về `PENDING`, reset xác nhận còn phòng và đánh dấu `informationChangedAt`).

### 6.4. Đối chiếu Thực tế 4 Hạng mục (`/api/rooms/{roomId}/inspections`)
- `GET /api/rooms/{roomId}/inspections`: Xem lịch sử kiểm tra 4 hạng mục (`CONDITION`, `PRICE_AND_FEES`, `IMAGES`, `RENTAL_RIGHTS`).
- `POST /api/rooms/{roomId}/inspections`: Nhân viên kiểm định lập biên bản thẩm định kèm ảnh bằng chứng và thời hạn hiệu lực.
- `POST /api/rooms/{roomId}/inspections/request`: Chủ nhà gửi yêu cầu điều phối kiểm định viên tới khảo sát thực địa.

### 6.5. Tìm bạn ở ghép 2 người (`/api/roommates`, `/api/roommate-connections`)
- `GET /api/roommates/profile`: Xem hồ sơ ở ghép cá nhân.
- `PUT /api/roommates/profile`: Cập nhật tiêu chí ghép phòng (ngân sách, ngày dọn vào, hút thuốc, thú cưng, giờ ngủ).
- `GET /api/roommates/suggestions`: Gợi ý bạn cùng phòng thỏa mãn điều kiện cứng 2 chiều (Ẩn email & số điện thoại bảo vệ riêng tư).
- `GET /api/roommates/profile/{userId}`: Xem hồ sơ người khác (Chỉ hiện liên hệ nếu đã có kết nối `ACCEPTED`).
- `POST /api/roommate-connections/invite`: Gửi lời mời kết nối ghép phòng.
- `POST /api/roommate-connections/{id}/accept`: Chấp nhận lời mời và mở kênh trò chuyện trực tiếp.

### 6.6. Tải Media & Cloudinary (`/api/upload`)
- `POST /api/upload/image`: Tải ảnh thông thường (avatar, bài viết). Yêu cầu đăng nhập, tối đa 10MB (JPEG, PNG, WebP, GIF).
- `POST /api/upload/rental-image`: Tải ảnh phòng trọ/nhà trọ. Yêu cầu quyền `LANDLORD`, `MODERATOR`, `ADMIN`.
- `POST /api/upload/document`: Tải tài liệu/CCCD (PDF, JPEG, PNG), tối đa 20MB.
