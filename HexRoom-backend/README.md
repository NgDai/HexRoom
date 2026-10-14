# HexRoom Backend - Java Spring Boot 3

Dự án backend HexRoom được chuyển đổi (port) từ mã nguồn Node.js/Express (`ez-room-be`) sang Java 21 và Spring Boot 3 chuẩn kiến trúc doanh nghiệp.

---

## 1. Công nghệ sử dụng

- **Ngôn ngữ:** Java 21 (LTS)
- **Framework:** Spring Boot 3.3.4
- **ORM / Database:** Spring Data JPA (Hibernate 6) + PostgreSQL Driver
- **Bảo mật:** Spring Security 6 + JJWT (JSON Web Token 0.12.6) + BCrypt
- **Tài liệu API:** Springdoc OpenAPI 2.6.0 (Swagger UI v3)
- **Build tool:** Maven (có sẵn Maven Wrapper `mvnw` & `mvnw.cmd`)
- **Tiện ích:** Lombok, Jakarta Bean Validation

---

## 2. Bảng đối chiếu chuyển đổi (Node.js -> Java Spring Boot)

| Thành phần Node.js (`ez-room-be`) | Thành phần Java Spring Boot (`HexRoom`) | Ghi chú |
| :--- | :--- | :--- |
| `server.js` | `HexRoomApplication.java`, `SecurityConfig.java`, `application.yml` | Khởi chạy ứng dụng, cấu hình CORS, Security Filter |
| `prisma/schema.prisma` | Package `entity/` (`User`, `RefreshToken`, `Rental`, `Room`, `Location`, `Amenity`, `LifestyleProfile`, `UserPreference`, ...) | JPA Entities ánh xạ chính xác schema PostgreSQL |
| `middleware/auth.js` | `JwtAuthenticationFilter.java`, `JwtTokenProvider.java`, `UserPrincipal.java` | Xác thực Bearer Token JWT, parse claims, stateless session |
| `controllers/auth.controller.js` + `services/auth.service.js` | `AuthController.java` + `AuthService.java` | Đăng ký, đăng nhập, cấp refresh token cookie, đổi mật khẩu, profile, lifestyle, preferences |
| `controllers/rental.controller.js` + `services/rental.service.js` | `RentalController.java` + `RentalService.java` | Đăng tin cho thuê, quản lý bài đăng, lọc theo quận huyện, duyệt bài |
| `controllers/room.controller.js` + `services/room.service.js` | `RoomController.java` + `RoomService.java` | Quản lý phòng, lọc đa tiêu chí (giá, diện tích, loại phòng, vị trí), đếm lượt tìm kiếm |
| `controllers/locations.controller.js` | `LocationController.java` + `LocationService.java` | Danh sách tỉnh/thành, quận/huyện |
| `controllers/amenities.controller.js` | `AmenityController.java` + `AmenityService.java` | Danh mục tiện ích phòng trọ |
| `validators/*` | Jakarta Bean Validation (`@Valid`, `@NotBlank`, `@Size`, `@DecimalMin`, ...) | Tự động validate dữ liệu DTO |
| `routes/public.js` | `PublicController.java` | Health check endpoint `/api/public/health` |

---

## 3. Cấu trúc thư mục dự án

```text
c:\Users\PC\Documents\HexRoom\Production\
├── .mvn/wrapper/                  # Maven Wrapper files
├── mvnw & mvnw.cmd               # Maven Wrapper script
├── pom.xml                       # Maven dependencies & build configuration
├── src/
│   ├── main/
│   │   ├── java/com/hexroom/backend/
│   │   │   ├── HexRoomApplication.java    # Main Entry Point
│   │   │   ├── common/                    # ApiResponse, PagedResponse
│   │   │   ├── config/                    # SecurityConfig, OpenApiConfig
│   │   │   ├── security/                  # JwtTokenProvider, JwtAuthenticationFilter, UserPrincipal
│   │   │   ├── entity/                    # JPA Entities (User, Rental, Room, Location, Amenity, ...)
│   │   │   │   └── enums/                 # UserRole, UserStatus, RentalStatus, RoomStatus, RoomType
│   │   │   ├── repository/                # Spring Data JPA Repositories
│   │   │   ├── dto/                       # Request/Response DTOs (auth, rental, room, location, amenity)
│   │   │   ├── service/                   # Business Services (Auth, Rental, Room, Location, Amenity)
│   │   │   ├── controller/                # REST Controllers
│   │   │   └── exception/                 # GlobalExceptionHandler, AppException, NotFound, Forbidden...
│   │   └── resources/
│   │       └── application.yml            # Database, JWT, CORS, Swagger configs
```

---

## 4. Hướng dẫn chạy dự án

### Cách 1: Sử dụng IntelliJ IDEA
1. Mở thư mục `c:\Users\PC\Documents\HexRoom\Production` trong IntelliJ IDEA.
2. IntelliJ sẽ tự động nhận diện dự án Maven từ file `pom.xml`.
3. Chạy file `src/main/java/com/hexroom/backend/HexRoomApplication.java`.

### Cách 2: Sử dụng dòng lệnh (Terminal / PowerShell)
```powershell
# Biên dịch dự án
.\mvnw.cmd clean compile

# Chạy ứng dụng
.\mvnw.cmd spring-boot:run
```

---

## 5. Tài liệu API (Swagger UI)

Khi ứng dụng đang chạy (mặc định cổng 8080):
- **Swagger UI:** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **OpenAPI JSON Spec:** [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

*(Swagger UI đã được tích hợp sẵn nút "Authorize" hỗ trợ nhập JWT Bearer Token để kiểm thử trực tiếp các API bảo mật)*

---

## 6. Các API chính đã chuyển đổi

### 6.1. Auth & Người dùng (`/api/auth`)
- `GET /api/auth/suggest-password`: Gợi ý mật khẩu mạnh
- `POST /api/auth/register`: Đăng ký tài khoản (hỗ trợ phân vai trò `TENANT`, `LANDLORD`)
- `POST /api/auth/login`: Đăng nhập, nhận Access Token (JWT) và Refresh Token qua HttpOnly Cookie
- `POST /api/auth/refresh`: Cấp lại Access Token từ Refresh Token
- `POST /api/auth/logout`: Đăng xuất phiên hiện tại
- `POST /api/auth/logout-all`: Đăng xuất toàn bộ các thiết bị
- `POST /api/auth/change-password`: Đổi mật khẩu
- `PUT /api/auth/profile`: Cập nhật thông tin cá nhân
- `GET /api/auth/lifestyle` & `PUT /api/auth/lifestyle`: Quản lý thông tin thói quen sống
- `GET /api/auth/preference` & `PUT /api/auth/preference`: Quản lý tiêu chí tìm trọ / tìm bạn cùng phòng

### 6.2. Nhà trọ & Bài đăng (`/api/rentals`)
- `GET /api/rentals`: Tìm kiếm danh sách bài đăng cho thuê (lọc theo quận, thành phố, trạng thái)
- `GET /api/rentals/{id}`: Chi tiết bài đăng cho thuê và các phòng thuộc bài đăng
- `POST /api/rentals`: Đăng tin cho thuê mới (dành cho `LANDLORD`, `ADMIN`)
- `PATCH /api/rentals/{id}/status`: Duyệt bài đăng (dành cho `MODERATOR`, `ADMIN`)
- `DELETE /api/rentals/{id}`: Xóa bài đăng

### 6.3. Phòng trọ (`/api/rooms`)
- `GET /api/rooms`: Tìm kiếm và lọc phòng trọ nâng cao (giá, diện tích, loại phòng, vị trí, từ khóa)
- `GET /api/rooms/{id}`: Xem chi tiết phòng trọ (tự động tăng bộ đếm lượt xem)
- `POST /api/rooms`: Tạo phòng mới thuộc bài đăng cho thuê
- `PUT /api/rooms/{id}`: Cập nhật phòng
- `DELETE /api/rooms/{id}`: Xóa phòng

### 6.4. Địa điểm & Tiện ích (`/api/locations`, `/api/amenities`)
- `GET /api/locations`: Danh sách địa điểm
- `GET /api/locations/cities`: Danh sách thành phố
- `GET /api/locations/districts`: Danh sách quận huyện
- `GET /api/amenities`: Danh mục tiện ích (WiFi, máy lạnh, máy giặt, gác lửng, tủ lạnh...)

---

## 7. Các giai đoạn tiếp theo (Next Phases)

Khi bạn cần mở rộng thêm các tính năng tiếp theo từ `ez-room-be`:
1. **Preorder & Booking:** Đặt cọc thuê phòng, xác nhận lịch thuê từ chủ nhà (`RoomRentalPeriod`).
2. **Thanh toán (Payment Gateway):** Tích hợp PayOS Java SDK hoặc VNPay để nạp ví và cọc online.
3. **Realtime Chat & Notification:** Spring WebSocket (STOMP) thay thế Socket.io.
4. **Moderator & Admin Reports:** Xử lý hàng đợi kiểm duyệt (`moderation_queue`), báo cáo vi phạm (`reports`).
5. **AI Search & Matching:** Tích hợp Spring AI hoặc gọi Gemini/OpenAI API cho tính năng gợi ý người ở ghép và tìm kiếm ngữ nghĩa.