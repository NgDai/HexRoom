package com.hexroom.backend.controller;

import com.hexroom.backend.common.ApiResponse;
import com.hexroom.backend.common.PagedResponse;
import com.hexroom.backend.dto.rental.RentalCreateRequest;
import com.hexroom.backend.dto.rental.RentalResponse;
import com.hexroom.backend.entity.enums.RentalStatus;
import com.hexroom.backend.entity.enums.UserRole;
import com.hexroom.backend.security.UserPrincipal;
import com.hexroom.backend.service.RentalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/rentals")
@RequiredArgsConstructor
@Tag(name = "Rentals", description = "Quản lý bài đăng cho thuê nhà trọ")
public class RentalController {

    private final RentalService rentalService;

    @GetMapping
    @Operation(summary = "Lấy danh sách các bài đăng cho thuê")
    public ResponseEntity<ApiResponse<PagedResponse<RentalResponse>>> listRentals(
            @RequestParam(required = false) RentalStatus status,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String city,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {

        PagedResponse<RentalResponse> rentals = rentalService.listRentals(status, district, city, page, limit);
        return ResponseEntity.ok(ApiResponse.success(rentals));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết bài đăng cho thuê")
    public ResponseEntity<ApiResponse<RentalResponse>> getRental(@PathVariable UUID id) {
        RentalResponse rental = rentalService.getRentalById(id);
        return ResponseEntity.ok(ApiResponse.success(rental));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    public ResponseEntity<ApiResponse<PagedResponse<RentalResponse>>> mine(@AuthenticationPrincipal UserPrincipal user,
            @RequestParam(defaultValue = "1") int page) {
        return ResponseEntity.ok(ApiResponse.success(rentalService.listRentalsByOwner(user.getId(), page, 100)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Tạo bài đăng cho thuê mới")
    public ResponseEntity<ApiResponse<RentalResponse>> createRental(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody RentalCreateRequest request) {

        RentalResponse created = rentalService.createRental(userPrincipal.getId(), request);
        return new ResponseEntity<>(ApiResponse.success("Tạo bài đăng thành công", created), HttpStatus.CREATED);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
    @Operation(summary = "Cập nhật trạng thái duyệt bài đăng")
    public ResponseEntity<ApiResponse<RentalResponse>> updateStatus(
            @PathVariable UUID id,
            @RequestParam RentalStatus status,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        RentalResponse updated = rentalService.updateRentalStatus(id, status, userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái bài đăng thành công", updated));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa bài đăng cho thuê")
    public ResponseEntity<ApiResponse<Void>> deleteRental(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        boolean isAdmin = userPrincipal.getRole() == UserRole.ADMIN;
        rentalService.deleteRental(id, userPrincipal.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success("Xóa bài đăng thành công"));
    }
}
