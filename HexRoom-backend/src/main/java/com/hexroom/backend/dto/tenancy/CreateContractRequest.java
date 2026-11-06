package com.hexroom.backend.dto.tenancy;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Chủ trọ khởi tạo hợp đồng cho một người thuê đã có tài khoản. */
public record CreateContractRequest(
        @NotNull(message = "Chọn phòng") UUID roomId,
        @NotNull(message = "Chọn người thuê") UUID tenantId,
        @NotNull(message = "Chọn ngày bắt đầu") LocalDate startDate,
        LocalDate endDate,
        @NotNull(message = "Nhập giá thuê thực tế")
        @DecimalMin(value = "0", message = "Giá thuê không được âm") BigDecimal monthlyRent,
        @DecimalMin(value = "0", message = "Tiền cọc không được âm") BigDecimal depositAmount,
        @Min(value = 1, message = "Kỳ thanh toán tối thiểu 1 tháng")
        @Max(value = 12, message = "Kỳ thanh toán tối đa 12 tháng") Integer paymentCycleMonths,
        @Min(value = 1, message = "Ngày thanh toán từ 1 đến 28")
        @Max(value = 28, message = "Ngày thanh toán từ 1 đến 28") Integer billingDay,
        @Size(max = 4000) String houseRules,
        @Size(max = 4000) String extraTerms,
        @Size(max = 1000) String landlordNote
) {
}
