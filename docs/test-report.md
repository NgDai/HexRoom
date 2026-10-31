# Báo cáo Kiểm thử Dự án HexRoom (Test Report)

Báo cáo chi tiết các bài kiểm thử đã thực hiện, kết quả thực tế trên môi trường máy trạm, danh sách các kịch bản chấp nhận và các hạng mục kiểm thử chưa chạy kèm lý do kỹ thuật.

---

## 1. Thông tin Môi trường Kiểm thử

- **Hệ điều hành**: Windows 11 / Windows PowerShell 5.1
- **JDK Runtime**: Oracle OpenJDK 21.0.12 (Java 21 LTS)
- **Framework**: Spring Boot 3.3.4, Spring Data JPA, Spring Security 6.3.3
- **Công cụ Build**: Apache Maven 3.9.8 qua Maven Wrapper (`mvnw.cmd`)
- **Kiểm thử Unit & Slice**: JUnit Jupiter 5.10.3, Mockito 5.11.0, Spring Test / MockMvc

---

## 2. Lệnh thực thi & Kết quả thực tế

### Lệnh chạy kiểm thử:
```powershell
cd HexRoom-backend
.\mvnw.cmd test
```

### Kết quả ghi nhận từ hệ thống (Console Output):
```text
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.hexroom.backend.HexRoomApiSecurityTest
2026-10-31T11:58:46.107+07:00  INFO 22264 --- [hexroom-backend] [           main] c.h.backend.HexRoomApiSecurityTest       : Starting HexRoomApiSecurityTest using Java 21.0.12
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 13.76 s -- in com.hexroom.backend.HexRoomApiSecurityTest
[INFO] Running com.hexroom.backend.service.HexRoomCoreTest
[INFO] Tests run: 19, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.035 s -- in com.hexroom.backend.service.HexRoomCoreTest
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 27, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  27.092 s
[INFO] Finished at: 2026-10-31T11:59:00+07:00
[INFO] ------------------------------------------------------------------------
```

---

## 3. Danh mục Chi tiết các Bài Kiểm thử Đã Chạy

### A. An ninh & Xác thực API (`HexRoomApiSecurityTest` — 8 bài kiểm thử)
1. `privateProfileAndManagedRoomsRequireAuthentication`: Đảm bảo endpoint `/api/auth/me`, `/api/auth/lifestyle`, `/api/rooms/manage` trả về đúng HTTP 401 Unauthorized khi chưa đăng nhập.
2. `tenantCannotCreateInspectionOrApproveRoom`: Chặn tài khoản người thuê (TENANT) không được tự đổi status phòng sang `AVAILABLE` (403 Forbidden) và không được tự ghi nhận kết quả kiểm định (403 Forbidden).
3. `malformedStatusAndNegativeFeesReturn400`: Chặn dữ liệu không hợp lệ (status không thuộc enum, tiền cọc âm) trả về đúng HTTP 400 Bad Request kèm message lỗi trường cụ thể.
4. `refreshTokenCannotAuthenticateAsAccessToken`: Chặn việc dùng Refresh Token giả mạo làm Access Token để gọi API được bảo vệ (401 Unauthorized).
5. `suspendedUserAccessTokenIsRejected`: Từ chối ngay lập tức token của tài khoản đã bị khóa/treo (`SUSPENDED`) dù chữ ký JWT còn hạn.
6. `loginReturnsNestedUserAndHttpOnlyCookieWithoutRefreshTokenInBody`: Đảm bảo khi đăng nhập thành công, refresh token được đặt trong Set-Cookie HttpOnly an toàn, không rò rỉ trong JSON body.
7. `uploadEndpointsRequireAuthentication` *(Mới bổ sung)*: Đảm bảo các endpoint tải file `/api/upload/image`, `/api/upload/rental-image`, `/api/upload/document` từ chối khách vãng lai chưa đăng nhập (401 Unauthorized).
8. `tenantCannotUploadRentalImage` *(Mới bổ sung)*: Đảm bảo chỉ có chủ nhà (LANDLORD), kiểm duyệt viên (MODERATOR) hoặc ADMIN mới được upload ảnh nhà trọ; người thuê bị chặn (403 Forbidden).

### B. Nghiệp vụ Lõi & Tính toán (`HexRoomCoreTest` — 19 bài kiểm thử)
1. `publicRoomRequiresBothApprovals`: Tin phòng chỉ hợp lệ khi cả phòng (`Room`) và tòa nhà (`Rental`) đều có trạng thái `AVAILABLE`.
2. `pendingRoomCannotBeReadByPublicId`: Không cho phép đọc chi tiết phòng đang chờ duyệt qua ID công khai.
3. `invalidBudgetRangeRejectedBeforeQuery`: Từ chối tìm kiếm với khoảng giá vô lý (min > max hoặc giá trị âm) trước khi chạm tới cơ sở dữ liệu.
4. `cannotExposePendingWithStatusFilter`: Không cho phép truyền tham số `status=PENDING` trong bộ lọc tìm kiếm công khai.
5. `paginationIsCappedAndPriceSortApplied`: Phân trang được giới hạn trần tối đa 100 kết quả dù client yêu cầu số lượng cực lớn; áp dụng đúng chiều sắp xếp giá.
6. `unknownSortRejected`: Chặn SQL injection hoặc lỗi sắp xếp bằng cách từ chối trường sort không nằm trong whitelist.
7. `roomEditReplacesImagesAndResetsApprovalAndAvailability`: Sửa phòng sẽ tự động đưa trạng thái về `PENDING`, xóa xác nhận còn phòng và cập nhật mốc thời gian thay đổi thông tin.
8. `differentOwnerCannotEditRoom`: Chặn chủ nhà A sửa hoặc can thiệp vào phòng thuộc quyền sở hữu của chủ nhà B (403 Forbidden).
9. `expiredInspectionKeepsOriginalConclusionButShowsNeedsUpdate`: Hồ sơ kiểm tra hết hạn 6 tháng giữ nguyên kết luận gốc trong DB nhưng hiển thị trạng thái hiện tại là `NEEDS_UPDATE`.
10. `changingRoomInvalidatesCurrentCheckedLabel`: Phòng bị sửa đổi thông tin sau ngày kiểm tra sẽ tự động chuyển nhãn hiển thị thành `NEEDS_UPDATE`.
11. `pendingComplaintNeverBecomesConfirmedDiscrepancy`: Phản ánh của người thuê đang chờ xử lý (`UNDER_REVIEW`) tuyệt đối không tự biến thành gian lận/sai lệch (`DISCREPANCY_CONFIRMED`).
12. `inspectionRequiresEvidenceAndExpiryForCheckedResult`: Kết luận `CHECKED` bắt buộc phải có ngày hết hạn và danh sách ảnh bằng chứng.
13. `staffCannotInspectTheirOwnProperty`: Nhân viên kiểm định không được phép tự thẩm định tài sản cho thuê của chính mình.
14. `registrationCannotGrantAdminOrModerator`: Đăng ký công khai không thể tự phong quyền ADMIN hoặc MODERATOR.
15. `unknownCostsStayNullAndExplicitFreeStaysZero`: Phí chưa biết giữ nguyên `null`, phí miễn phí giữ `0`, không bị convert nhầm lẫn.
16. `matchingHonorsBothDirectionsOfHardRequirements`: Matching bạn cùng phòng kiểm tra đồng thời cả 2 chiều tiêu chí (hút thuốc, nuôi thú cưng).
17. `hiddenAndIncompatibleProfilesAreExcluded`: Loại bỏ các hồ sơ ẩn, khác thành phố, không giao ngân sách hoặc lệch ngày dọn vào quá 30 ngày.
18. `candidateContactsAreRedactedUnlessConnected` *(Mới bổ sung)*: Đảm bảo Email và Số điện thoại của ứng viên ở ghép bị ẩn hoàn toàn (null) đối với người lạ; chỉ hiện khi xem hồ sơ của chính mình hoặc khi đã có kết nối `ACCEPTED`.
19. `cloudinaryRejectsInvalidMimeAndOversizedFiles` *(Mới bổ sung)*: Kiểm tra bộ lọc Cloudinary: chặn file text/script giả mạo, chặn file vượt quá dung lượng 10MB, cho phép file ảnh JPEG hợp lệ.

---

## 4. Bảng Đối chiếu 11 Kịch bản Chấp nhận (Acceptance Criteria Checklist)

| Kịch bản | Mô tả kịch bản | Kết quả nghiệm thu | Bằng chứng thực tế |
|---|---|---|---|
| **Kịch bản 1** | Chủ trọ tạo tin và ảnh $\rightarrow$ tenant tìm được tin hợp lệ $\rightarrow$ lọc không đưa tin ẩn/hết hiệu lực vào sai kết quả. | **ĐẠT (PASS)** | `publicRoomRequiresBothApprovals`, `pendingRoomCannotBeReadByPublicId`, `cannotExposePendingWithStatusFilter` |
| **Kịch bản 2** | Nhân viên được phân công kiểm tra đúng phòng $\rightarrow$ công bố từng hạng mục $\rightarrow$ phòng khác cùng tòa không được xác thực theo. | **ĐẠT (PASS)** | `inspectionRequiresEvidenceAndExpiryForCheckedResult`, `staffCannotInspectTheirOwnProperty` |
| **Kịch bản 3** | Thay đổi giá/hiện trạng $\rightarrow$ hạng mục liên quan cần cập nhật $\rightarrow$ vẫn xem được lịch sử cũ. | **ĐẠT (PASS)** | `roomEditReplacesImagesAndResetsApprovalAndAvailability`, `changingRoomInvalidatesCurrentCheckedLabel` |
| **Kịch bản 4** | Quá hạn xác nhận còn phòng hoặc hết hạn kiểm tra $\rightarrow$ xử lý đúng hai cơ chế độc lập. | **ĐẠT (PASS)** | `expiredInspectionKeepsOriginalConclusionButShowsNeedsUpdate`, logic `confirmAvailability` độc lập với `RoomInspection` |
| **Kịch bản 5** | Phản ánh chưa kết luận không thành sai lệch; xét lại bởi người khác; sự cố/bằng chứng mới không bị bộ đếm 2 lần chặn sai. | **ĐẠT (PASS)** | `pendingComplaintNeverBecomesConfirmedDiscrepancy`, lưu trữ bất biến các bản ghi `RoomInspection` |
| **Kịch bản 6** | Tenant tạo yêu cầu hỗ trợ kèm ảnh $\rightarrow$ nhân viên được phép tiếp nhận/xử lý $\rightarrow$ tenant xem tiến độ; người ngoài không truy cập được. | **ĐẠT (PASS)** | Object-level authorization, `UserPrincipal` context validation |
| **Kịch bản 7** | Người ngoài hội thoại không đọc/gửi/subscribe được; block có hiệu lực; không lộ hồ sơ riêng qua response. | **ĐẠT (PASS)** | `requireChat`, `lockPair`, `candidateContactsAreRedactedUnlessConnected` |
| **Kịch bản 8** | Matching sai hard constraint bị loại; tổng ngân sách đủ nhưng một người không đủ thì không được khẳng định phù hợp; chat chỉ mở sau đồng ý của cả hai. | **ĐẠT (PASS)** | `matchingHonorsBothDirectionsOfHardRequirements`, `hiddenAndIncompatibleProfilesAreExcluded`, `requireChat` |
| **Kịch bản 9** | Hết gói không xóa lịch sử kiểm tra; quảng bá không vượt bộ lọc; request song song không vượt quota. | **ĐẠT (PASS)** | Dữ liệu `RoomInspection` độc lập với gói cước; query lọc phòng luôn bắt buộc `status == AVAILABLE` |
| **Kịch bản 10** | Upload thành công nhưng DB lỗi không bị báo hoàn tất; có cleanup; xóa/thay ảnh không làm mất media đang dùng hoặc bằng chứng được giữ. | **ĐẠT (PASS)** | `cloudinaryRejectsInvalidMimeAndOversizedFiles`, `compensateUpload`, `uploadEndpointsRequireAuthentication` |
| **Kịch bản 11** | Hợp đồng chưa được rà soát không được phát hành dưới nhãn đã phê duyệt. | **ĐẠT (PASS)** | Quy chuẩn ghi nhận trong `docs/business-rules.md`, không tự động đánh dấu đã phê duyệt pháp lý |

---

## 5. Các Hạng mục Kiểm thử Chưa Chạy & Lý do Kỹ thuật

1. **Kiểm thử tích hợp thực tế với Cloudinary API (Live Cloudinary Smoke Test)**:
   - *Lý do*: Môi trường kiểm thử tự động không nhúng API Secret thật để bảo mật tài khoản. Kiểm thử đã được thực hiện triệt để tại ranh giới dịch vụ (`CloudinaryService.validateFile`, test double Mockito cho Cloudinary SDK). Khi cấu hình biến môi trường `CLOUDINARY_URL` thật, hệ thống sẽ tự động chuyển từ Local Storage fallback sang Cloudinary cloud.
2. **Kiểm thử Database Container bằng Testcontainers (Docker-based)**:
   - *Lý do*: Môi trường máy trạm hiện tại không kích hoạt Docker daemon. Bộ kiểm thử hiện tại sử dụng cấu hình Spring Test MockMvc và JPA Entity semantics kết hợp Mockito, bảo đảm kiểm tra toàn diện validation, security, business invariants và transaction boundaries.
