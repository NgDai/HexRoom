package com.hexroom.backend.dto.tenancy;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Chủ trọ lập hoá đơn tháng. Nếu {@code itemServices} được truyền, hoá đơn ghi đè
 * số lượng/đơn giá của từng dịch vụ; ngược lại hệ thống tự lấy các dịch vụ người thuê
 * đã đăng ký.
 */
public record CreateInvoiceRequest(
        @NotNull @Min(1) @Max(12) Integer billingMonth,
        @NotNull @Min(2020) @Max(2100) Integer billingYear,
        LocalDate dueDate,
        @Size(max = 1000) String note,
        BigDecimal otherAmount,
        List<ItemInput> items
) {
    public record ItemInput(
            @NotNull java.util.UUID serviceId,
            @DecimalMin("0") BigDecimal quantity,
            @DecimalMin("0") BigDecimal unitPrice
    ) {
    }
}
