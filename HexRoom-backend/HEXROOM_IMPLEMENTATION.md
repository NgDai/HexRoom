# HexRoom — bản cập nhật giao diện và nghiệp vụ

Ngày: 15/10/2026. Nguồn yêu cầu: `../HexRoom idea.md`. Tên đang dùng: **HexRoom**, theo tên dự án hiện tại; tài liệu ý tưởng vẫn có tên Nestly.

## Mã nguồn và chạy thử

- Backend: thư mục `Production`, Java 21 / Spring Boot.
- Frontend: thư mục `../frontend`, React / TypeScript / Vite. Không chỉnh hai thư mục nguồn `ez-room-*-source`.
- Backend: `./mvnw.cmd spring-boot:run` (cần database PostgreSQL cấu hình sẵn).
- Frontend: trong `../frontend`, chạy `npm.cmd run dev` rồi mở `http://localhost:5173/home`.
- `VITE_API_URL` có thể là `http://localhost:8080` hoặc `http://localhost:8080/api`; helper tự thêm `/api` đúng một lần.
- Luồng email/mật khẩu không cần cấu hình Supabase ở frontend. Google OAuth chưa có xác thực tương ứng ở Spring Boot nên không hiển thị nút đăng nhập Google.
- Với HTTPS, đặt `APP_JWT_COOKIE_SECURE=true` (Spring relaxed binding cho `app.jwt.cookie-secure`).

## Luồng đã nối với Spring Boot

| Trang | Nội dung |
| --- | --- |
| `/home` | Trang chủ HexRoom, minh họa có nhãn, phòng từ API thật, trạng thái tải/rỗng/lỗi |
| `/rooms` | Từ khóa, thành phố, loại phòng, khoảng giá, sắp xếp giá/ngày đăng, phân trang |
| `/room/:id` | Thông tin phòng, giá/phí/cọc, nội quy, xác nhận còn phòng, lịch sử kiểm tra, tính chi phí chia đều |
| `/how-it-works` | Cách đọc phạm vi, bằng chứng, thời hạn và trạng thái kiểm tra |
| `/workspace` | Chủ trọ tạo nhà trọ/phòng, sửa thông tin, xác nhận còn phòng; moderator/admin duyệt và ghi kiểm tra |
| `/roommate` | Hồ sơ tự nguyện cho người xác nhận từ 18 tuổi; gợi ý theo điều kiện hai chiều |
| `/profile` | Hồ sơ cá nhân và đổi mật khẩu |
| `/favorites` | Lưu/bỏ lưu phòng theo tài khoản; khách dùng lưu cục bộ từ context hiện có |

Khi tạo tin: tạo nhà trọ → thêm phòng → moderator/admin duyệt **cả nhà trọ và phòng** → phòng xuất hiện công khai. Duyệt đăng không tạo kết quả kiểm tra. Khi sửa nội dung phòng, trạng thái trở lại `PENDING`, xóa xác nhận còn phòng và đánh dấu hồ sơ đã kiểm tra là cần cập nhật.

## Dữ liệu bổ sung

- `rooms`: các trường embedded `RoomCosts`, `availabilityConfirmedAt`, `informationChangedAt`.
- Phí gồm tiền cọc, điện/kWh, nước/m³, internet/tháng, gửi xe/tháng, dịch vụ/tháng, kỳ thanh toán, nội quy và ghi chú. `null` là chưa biết, `0` là miễn phí. Tiền thuê và tiền cọc hiển thị riêng.
- `room_inspections` + `inspection_evidence`: hồ sơ theo từng phòng/hạng mục, người kiểm tra nội bộ, ngày kiểm tra, thời hạn, phương pháp, kết quả và URL ảnh bằng chứng. API công khai không trả danh tính nhân viên.
- `roommate_profiles`: biệt danh, thành phố, ngân sách từng người, ngày chuyển vào, tiêu chí hút thuốc/thú cưng/giờ ngủ và lựa chọn hiển thị. Không trả tên tài khoản, email, điện thoại hoặc địa chỉ riêng trong gợi ý.
- Hiện dự án dùng Hibernate `ddl-auto: update`: schema bổ sung được tạo khi chạy backend. Chưa tạo dữ liệu giả hoặc nạp seed vào database của người dùng. Cần chuyển sang migration có phiên bản trước khi vận hành chính thức.

## API mới và quy tắc

- `GET /api/auth/me`: tài khoản hiện tại.
- `GET /api/rooms/manage`: danh sách quản lý theo quyền, 20 phòng/trang.
- `GET /api/rentals/mine`: nhà trọ của tài khoản, 100 tin/trang; UI tạo phòng hiện lấy trang đầu.
- `POST /api/rooms/{id}/confirm-availability`: chủ sở hữu/admin, chỉ áp dụng phòng đã duyệt.
- `PATCH /api/rooms/{id}/status`: moderator/admin; body `{ "status": "AVAILABLE" }`.
- `GET|POST /api/rooms/{id}/inspections`: xem lịch sử / nhân viên ghi thêm bản ghi. Không tự kiểm tra phòng mình sở hữu. Kết luận đã đối chiếu/sai lệch phải có ảnh; đã đối chiếu phải có thời hạn.
- `GET|POST|DELETE /api/favorites...`: lưu phòng cho đúng tài khoản; chỉ trả phòng và nhà trọ đã duyệt.
- `GET|PUT /api/roommates/profile`, `GET /api/roommates/suggestions`: ngân sách giao nhau, cùng thành phố, ngày chuyển vào chênh tối đa 30 ngày, chấp nhận hút thuốc/thú cưng ở cả hai chiều. Giờ ngủ dùng để nêu điểm cần trao đổi. Đây là sàng lọc theo quy tắc, không phải AI.
- Giới hạn danh sách phòng công khai tối đa 100/trang, báo 400 cho khoảng giá/diện tích không hợp lệ.
- Đăng ký chỉ cấp TENANT/LANDLORD. API hồ sơ yêu cầu đăng nhập; refresh token không được dùng như access token; tài khoản khóa bị từ chối. Refresh token chỉ gửi qua cookie HttpOnly; frontend gộp các yêu cầu làm mới phiên đồng thời.

## Kiểm tra

```powershell
# Tại Production, kiểm thử không cần kết nối database
.\mvnw.cmd -q '-Dtest=HexRoomCoreTest,HexRoomApiSecurityTest' test

# Tại frontend
npm.cmd run build
npx.cmd eslint src/app/features/hexroom src/app/features/home/HomePage.tsx src/app/features/home/components/Header.tsx src/app/features/home/components/Footer.tsx src/app/context/AuthProvider.tsx src/lib/hexroom-api.ts src/lib/room-adapter.ts src/app/features/auth/LoginPage.tsx src/app/features/rooms/RoomsPage.tsx src/app/features/common/RegisterPage.tsx
```

23 kiểm thử backend kiểm tra điều kiện hiển thị phòng, phân quyền, xác thực, validation, phí chưa biết/miễn phí, thay ảnh, hiệu lực hồ sơ kiểm tra và điều kiện ghép hai chiều. Build TypeScript/Vite và ESLint cho phần giao diện thay đổi đã chạy. Chưa kiểm tra trực quan bằng trình duyệt vì phiên công cụ không có browser khả dụng. Chưa kiểm thử end-to-end ghi dữ liệu thật.

## Phần cần triển khai tiếp

- Gửi lời mời ghép và chat sau khi hai bên đồng ý; chặn/báo cáo; quy trình xử lý phản ánh. Hiện có khám phá hồ sơ và ghi nhận kết quả kiểm tra, chưa có toàn bộ workflow tranh chấp.
- Upload ảnh hiện dùng URL, chưa có upload/storage mới; nhân viên cần che dữ liệu cá nhân trước khi nhập ảnh công khai.
- Chưa có bộ lọc bản đồ, trường/công ty, quy tắc tự ẩn tin quá hạn, SLA hỗ trợ, hợp đồng mẫu được rà soát pháp lý, subscription/promotion hay AI.
- Các trang legacy từ mã nguồn cũ (wallet, payment, blog, admin nâng cao, tìm kiếm AI, chat…) còn trong repository và một số route cũ; chưa cam kết tương thích toàn bộ. Điều hướng chính đã chuyển sang các luồng mới. Sửa theo từng module khi chốt phạm vi tiếp theo.
- HexRoom không thu hộ tiền thuê hoặc giữ tiền cọc trong các luồng mới.
- Vite còn cảnh báo kích thước bundle Ant Design lớn; không chặn build.

Trong phiên làm việc có một tiến trình khác thêm/xóa module backend. Cuối phiên đã chạy lại bộ kiểm thử trên workspace sau khi các file đó được thu hồi; không xóa hoặc reset thay đổi của người dùng.
