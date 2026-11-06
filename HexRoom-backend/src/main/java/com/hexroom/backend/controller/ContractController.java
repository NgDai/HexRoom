package com.hexroom.backend.controller;

import com.hexroom.backend.common.ApiResponse;
import com.hexroom.backend.dto.tenancy.ContractResponse;
import com.hexroom.backend.dto.tenancy.CreateContractRequest;
import com.hexroom.backend.security.UserPrincipal;
import com.hexroom.backend.service.ContractService;
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
@RequestMapping("/api/tenancy/contracts")
@RequiredArgsConstructor
@Tag(name = "Tenancy – Contracts", description = "Hợp đồng thuê phòng hai chiều")
public class ContractController {

    private final ContractService contractService;

    @GetMapping("/mine")
    @Operation(summary = "Hợp đồng của người thuê (tất cả trạng thái)")
    public ResponseEntity<ApiResponse<List<ContractResponse>>> mine(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.success(contractService.listForTenant(user.getId())));
    }

    @GetMapping("/my-rooms")
    @Operation(summary = "Phòng của tôi — chỉ hợp đồng đã kích hoạt")
    public ResponseEntity<ApiResponse<List<ContractResponse>>> myRooms(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.success(contractService.myRooms(user.getId())));
    }

    @GetMapping("/landlord")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Hợp đồng do chủ trọ quản lý")
    public ResponseEntity<ApiResponse<List<ContractResponse>>> landlordContracts(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.success(contractService.listForLandlord(user.getId())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ContractResponse>> detail(
            @PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.success(contractService.get(id, user.getId())));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Chủ trọ khởi tạo hợp đồng và gửi cho người thuê")
    public ResponseEntity<ApiResponse<ContractResponse>> create(
            @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody CreateContractRequest request) {
        ContractResponse created = contractService.create(user.getId(), request);
        return new ResponseEntity<>(ApiResponse.success("Đã gửi hợp đồng cho người thuê", created), HttpStatus.CREATED);
    }

    public record NoteRequest(String note) {}

    @PostMapping("/{id}/tenant-confirm")
    @Operation(summary = "Người thuê xác nhận đồng ý hợp đồng")
    public ResponseEntity<ApiResponse<ContractResponse>> tenantConfirm(
            @PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user,
            @RequestBody(required = false) NoteRequest body) {
        return ResponseEntity.ok(ApiResponse.success("Đã xác nhận hợp đồng",
                contractService.tenantConfirm(id, user.getId(), body != null ? body.note() : null)));
    }

    @PostMapping("/{id}/tenant-reject")
    @Operation(summary = "Người thuê từ chối hợp đồng kèm lý do")
    public ResponseEntity<ApiResponse<ContractResponse>> tenantReject(
            @PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user,
            @RequestBody(required = false) NoteRequest body) {
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối hợp đồng",
                contractService.tenantReject(id, user.getId(), body != null ? body.note() : null)));
    }

    public record LandlordConfirmRequest(Boolean depositReceived, String note) {}

    @PostMapping("/{id}/landlord-confirm")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Chủ trọ xác nhận — kích hoạt hợp đồng và mở phòng cho người thuê")
    public ResponseEntity<ApiResponse<ContractResponse>> landlordConfirm(
            @PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user,
            @RequestBody(required = false) LandlordConfirmRequest body) {
        boolean deposit = body != null && Boolean.TRUE.equals(body.depositReceived());
        return ResponseEntity.ok(ApiResponse.success("Hợp đồng đã được kích hoạt",
                contractService.landlordConfirm(id, user.getId(), deposit, body != null ? body.note() : null)));
    }

    @PostMapping("/{id}/end")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Kết thúc hợp đồng đang hiệu lực")
    public ResponseEntity<ApiResponse<ContractResponse>> end(
            @PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user,
            @RequestBody(required = false) NoteRequest body) {
        return ResponseEntity.ok(ApiResponse.success("Đã kết thúc hợp đồng",
                contractService.end(id, user.getId(), body != null ? body.note() : null)));
    }

    public record TenantLookup(UUID id, String fullName, String email, String phone, String avatarUrl, String gender) {}
    @GetMapping("/search-tenants")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Chủ trọ tìm tài khoản người thuê theo email hoặc số điện thoại")
    public ResponseEntity<ApiResponse<List<TenantLookup>>> searchTenants(@RequestParam String q) {
        String query = q == null ? "" : q.trim();
        if (query.length() < 2) return ResponseEntity.ok(ApiResponse.success(List.of()));
        List<TenantLookup> found = contractService.searchTenants(query).stream()
                .map(u -> new TenantLookup(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getAvatarUrl(), u.getGender()))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(found));
    }
}
