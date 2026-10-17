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
    @Operation(summary = "Lấy danh sách phòng đã thuê/đặt của người dùng hiện tại")
    public ResponseEntity<ApiResponse<java.util.List<Object>>> getMyBookings(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.success(java.util.Collections.emptyList()));
    }

    @GetMapping("/manage")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN', 'MODERATOR')")
    public ResponseEntity<ApiResponse<PagedResponse<RoomResponse>>> managed(
            @AuthenticationPrincipal UserPrincipal user, @RequestParam(defaultValue = "1") int page) {
        return ResponseEntity.ok(ApiResponse.success(roomService.managedRooms(user.getId(), user.getRole() != UserRole.LANDLORD, page)));
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
