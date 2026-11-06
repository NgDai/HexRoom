package com.hexroom.backend.controller;

import com.hexroom.backend.common.ApiResponse;
import com.hexroom.backend.dto.tenancy.RoomServiceResponse;
import com.hexroom.backend.dto.tenancy.ServiceRequest;
import com.hexroom.backend.security.UserPrincipal;
import com.hexroom.backend.service.RoomServiceCatalog;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tenancy")
@RequiredArgsConstructor
@Tag(name = "Tenancy – Services", description = "Danh mục dịch vụ của phòng và đăng ký của người thuê")
public class RoomServiceController {

    private final RoomServiceCatalog catalog;

    @GetMapping("/rooms/{roomId}/services")
    @Operation(summary = "Danh mục dịch vụ của một phòng")
    public ResponseEntity<ApiResponse<List<RoomServiceResponse>>> listForRoom(@PathVariable UUID roomId) {
        return ResponseEntity.ok(ApiResponse.success(catalog.listForRoom(roomId)));
    }

    @PostMapping("/rooms/{roomId}/services")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Chủ trọ thêm dịch vụ cho phòng")
    public ResponseEntity<ApiResponse<RoomServiceResponse>> create(
            @PathVariable UUID roomId, @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody ServiceRequest request) {
        return new ResponseEntity<>(ApiResponse.success("Đã thêm dịch vụ",
                catalog.create(roomId, user.getId(), request)), HttpStatus.CREATED);
    }

    @PutMapping("/services/{serviceId}")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    public ResponseEntity<ApiResponse<RoomServiceResponse>> update(
            @PathVariable UUID serviceId, @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody ServiceRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật dịch vụ",
                catalog.update(serviceId, user.getId(), request)));
    }

    @DeleteMapping("/services/{serviceId}")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID serviceId, @AuthenticationPrincipal UserPrincipal user) {
        catalog.delete(serviceId, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Đã xoá dịch vụ"));
    }

    @GetMapping("/contracts/{contractId}/services")
    @Operation(summary = "Dịch vụ của phòng kèm trạng thái đăng ký của người thuê")
    public ResponseEntity<ApiResponse<List<RoomServiceResponse>>> listForContract(
            @PathVariable UUID contractId, @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.success(catalog.listForContract(contractId, user.getId())));
    }

    public record SubscribeRequest(Boolean subscribed) {}

    @PostMapping("/contracts/{contractId}/services/{serviceId}/subscribe")
    @Operation(summary = "Người thuê đăng ký hoặc bỏ đăng ký một dịch vụ")
    public ResponseEntity<ApiResponse<RoomServiceResponse>> subscribe(
            @PathVariable UUID contractId, @PathVariable UUID serviceId,
            @AuthenticationPrincipal UserPrincipal user,
            @RequestBody SubscribeRequest body) {
        boolean subscribed = body == null || !Boolean.FALSE.equals(body.subscribed());
        return ResponseEntity.ok(ApiResponse.success(
                subscribed ? "Đã đăng ký dịch vụ" : "Đã bỏ đăng ký dịch vụ",
                catalog.setSubscription(contractId, serviceId, user.getId(), subscribed)));
    }
}
