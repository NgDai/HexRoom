package com.hexroom.backend.dto.tenancy;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ServiceRequest(
        @NotBlank(message = "Nhập tên dịch vụ") @Size(max = 120) String name,
        String category,
        @DecimalMin(value = "0", message = "Đơn giá không được âm") BigDecimal unitPrice,
        @Size(max = 30) String unit,
        @Size(max = 500) String description,
        Boolean active
) {
}
