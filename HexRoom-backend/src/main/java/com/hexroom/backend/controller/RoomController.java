package com.hexroom.backend.controller;

import com.hexroom.backend.common.ApiResponse;
import com.hexroom.backend.common.PagedResponse;
import com.hexroom.backend.dto.room.RoomCreateRequest;
import com.hexroom.backend.dto.room.RoomFilterRequest;
import com.hexroom.backend.dto.room.RoomResponse;
import com.hexroom.backend.entity.enums.RoomStatus;
import com.hexroom.backend.entity.enums.RoomType;
import com.hexroom.backend.entity.enums.UserRole;
import com.hexroom.backend.security.UserPrincipal;
import com.hexroom.backend.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@Tag(name = "Rooms", description = "Quản lý và tìm kiếm phòng trọ")
public class RoomController {

    private final RoomService roomService;
    private final com.hexroom.backend.service.ContractService contractService;

    public record AddOccupantRequest(
            @jakarta.validation.constraints.NotNull UUID tenantId,
            @jakarta.validation.constraints.NotNull java.time.LocalDate startDate,
            java.time.LocalDate endDate,
            @jakarta.validation.constraints.NotNull BigDecimal actualPrice,
            BigDecimal deposit) {}

    @PostMapping("/{id}/contracts")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Thêm người ở — tạo hợp đồng chờ người thuê xác nhận")
    public ResponseEntity<ApiResponse<com.hexroom.backend.dto.tenancy.ContractResponse>> addOccupant(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody AddOccupantRequest request) {
        var req = new com.hexroom.backend.dto.tenancy.CreateContractRequest(
                id, request.tenantId(), request.startDate(), request.endDate(),
                request.actualPrice(), request.deposit(), 1, 5, null, null, null);
        var created = contractService.create(user.getId(), req);
        return new ResponseEntity<>(ApiResponse.success("Đã gửi hợp đồng cho người thuê", created), HttpStatus.CREATED);
    }

    @GetMapping
    @Operation(summary = "Tìm kiếm và lọc danh sách phòng trọ")
    public ResponseEntity<ApiResponse<PagedResponse<RoomResponse>>> listRooms(
            @RequestParam(required = false) UUID rentalId,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) BigDecimal minSize,
            @RequestParam(required = false) BigDecimal maxSize,
            @RequestParam(required = false) RoomType roomType,
            @RequestParam(required = false) RoomStatus status,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {

        RoomFilterRequest filter = RoomFilterRequest.builder()
                .rentalId(rentalId)
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .minSize(minSize)
                .maxSize(maxSize)
                .roomType(roomType)
                .status(status)
                .district(district)
                .city(city)
                .keyword(keyword)
                .sort(sort)
                .page(page)
                .limit(limit)
                .build();

        PagedResponse<RoomResponse> rooms = roomService.listRooms(filter);
        return ResponseEntity.ok(ApiResponse.success(rooms));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết một phòng trọ")
    public ResponseEntity<ApiResponse<RoomResponse>> getRoom(@PathVariable UUID id) {
        RoomResponse room = roomService.getRoomById(id);
        return ResponseEntity.ok(ApiResponse.success(room));
    }

    @GetMapping("/my-bookings")
    @Operation(summary = "Lịch sử thuê phòng của người dùng hiện tại")
    public ResponseEntity<ApiResponse<java.util.List<com.hexroom.backend.dto.tenancy.ContractResponse>>> getMyBookings(
            @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.success(contractService.listForTenant(user.getId())));
    }

    @GetMapping("/manage")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN', 'MODERATOR')")
    public ResponseEntity<ApiResponse<PagedResponse<RoomResponse>>> managed(
            @AuthenticationPrincipal UserPrincipal user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(required = false, defaultValue = "false") boolean all) {
        boolean showAll = all && (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.MODERATOR);
        return ResponseEntity.ok(ApiResponse.success(roomService.managedRooms(user.getId(), showAll, page)));
    }

    @PostMapping("/{id}/confirm-availability")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    public ResponseEntity<ApiResponse<RoomResponse>> confirm(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.success(roomService.confirmAvailability(id, user.getId(), user.getRole() == UserRole.ADMIN)));
    }

    public record StatusRequest(@jakarta.validation.constraints.NotNull RoomStatus status) {}

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<RoomResponse>> moderate(@PathVariable UUID id, @Valid @RequestBody StatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success(roomService.moderate(id, request.status())));
    }

    @GetMapping("/search-tenants")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN', 'MODERATOR')")
    @Operation(summary = "Tìm tài khoản người thuê theo email hoặc số điện thoại")
    public ResponseEntity<ApiResponse<java.util.List<com.hexroom.backend.controller.ContractController.TenantLookup>>> searchTenants(
            @RequestParam String q) {
        String query = q == null ? "" : q.trim();
        if (query.length() < 2) return ResponseEntity.ok(ApiResponse.success(java.util.List.of()));
        var found = contractService.searchTenants(query).stream()
                .map(u -> new com.hexroom.backend.controller.ContractController.TenantLookup(
                        u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getAvatarUrl(), u.getGender()))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(found));
    }

    @GetMapping("/{id}/tenants")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN', 'MODERATOR')")
    @Operation(summary = "Danh sách hợp đồng/người ở của một phòng")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> roomOccupants(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal user) {
        var list = contractService.listForRoom(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success(java.util.Map.of("rentals", list, "preorders", java.util.List.of())));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Thêm phòng mới vào bài đăng cho thuê")
    public ResponseEntity<ApiResponse<RoomResponse>> createRoom(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody RoomCreateRequest request) {

        boolean isAdmin = userPrincipal.getRole() == UserRole.ADMIN;
        RoomResponse created = roomService.createRoom(userPrincipal.getId(), request, isAdmin);
        return new ResponseEntity<>(ApiResponse.success("Thêm phòng thành công", created), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Cập nhật thông tin phòng trọ")
    public ResponseEntity<ApiResponse<RoomResponse>> updateRoom(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody RoomCreateRequest request) {

        boolean isAdmin = userPrincipal.getRole() == UserRole.ADMIN;
        RoomResponse updated = roomService.updateRoom(id, userPrincipal.getId(), request, isAdmin);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật phòng thành công", updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Xóa phòng trọ")
    public ResponseEntity<ApiResponse<Void>> deleteRoom(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        boolean isAdmin = userPrincipal.getRole() == UserRole.ADMIN;
        roomService.deleteRoom(id, userPrincipal.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success("Xóa phòng thành công"));
    }
}
