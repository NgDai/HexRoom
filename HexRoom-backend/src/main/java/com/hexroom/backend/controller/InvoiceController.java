package com.hexroom.backend.controller;

import com.hexroom.backend.common.ApiResponse;
import com.hexroom.backend.dto.tenancy.CreateInvoiceRequest;
import com.hexroom.backend.dto.tenancy.InvoiceResponse;
import com.hexroom.backend.security.UserPrincipal;
import com.hexroom.backend.service.InvoiceService;
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
@RequestMapping("/api/tenancy/invoices")
@RequiredArgsConstructor
@Tag(name = "Tenancy – Invoices", description = "Hoá đơn tiền phòng và dịch vụ theo tháng")
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping("/mine")
    @Operation(summary = "Hoá đơn của người thuê")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> mine(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.listForTenant(user.getId())));
    }

    @GetMapping("/landlord")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Hoá đơn do chủ trọ phát hành")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> landlord(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.listForLandlord(user.getId())));
    }

    @GetMapping("/contract/{contractId}")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> byContract(
            @PathVariable UUID contractId, @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.listForContract(contractId, user.getId())));
    }

    @PostMapping("/contract/{contractId}")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Chủ trọ lập hoá đơn tháng")
    public ResponseEntity<ApiResponse<InvoiceResponse>> create(
            @PathVariable UUID contractId, @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody CreateInvoiceRequest request) {
        InvoiceResponse created = invoiceService.create(contractId, user.getId(), request);
        return new ResponseEntity<>(ApiResponse.success("Đã lập hoá đơn", created), HttpStatus.CREATED);
    }

    public record TenantPaidRequest(String paymentMethod, String note) {}

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Chủ trọ sửa hoá đơn chưa thanh toán")
    public ResponseEntity<ApiResponse<InvoiceResponse>> update(
            @PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody CreateInvoiceRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật hoá đơn",
                invoiceService.update(id, user.getId(), request)));
    }
    @PostMapping("/{id}/tenant-confirm")
    @Operation(summary = "Người thuê xác nhận đã chuyển tiền")
    public ResponseEntity<ApiResponse<InvoiceResponse>> tenantConfirm(
            @PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user,
            @RequestBody(required = false) TenantPaidRequest body) {
        return ResponseEntity.ok(ApiResponse.success("Đã ghi nhận thanh toán của bạn",
                invoiceService.tenantConfirmPaid(id, user.getId(),
                        body != null ? body.paymentMethod() : null,
                        body != null ? body.note() : null)));
    }

    @PostMapping("/{id}/landlord-confirm")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Chủ trọ xác nhận đã nhận tiền")
    public ResponseEntity<ApiResponse<InvoiceResponse>> landlordConfirm(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "false") boolean allowWithoutTenantConfirm,
            @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.success("Đã xác nhận thanh toán",
                invoiceService.landlordMarkPaid(id, user.getId(), allowWithoutTenantConfirm)));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> cancel(
            @PathVariable UUID id, @AuthenticationPrincipal UserPrincipal user,
            @RequestBody(required = false) ContractController.NoteRequest body) {
        return ResponseEntity.ok(ApiResponse.success("Đã huỷ hoá đơn",
                invoiceService.cancel(id, user.getId(), body != null ? body.note() : null)));
    }
}
