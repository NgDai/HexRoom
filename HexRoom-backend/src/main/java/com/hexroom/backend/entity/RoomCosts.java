package com.hexroom.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

/** Null means not supplied; zero means explicitly free. Amounts are VND. */
@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomCosts {
    @DecimalMin("0") @Column(precision = 12, scale = 2)
    private BigDecimal deposit;
    @DecimalMin("0") @Column(precision = 12, scale = 2)
    private BigDecimal electricityPerKwh;
    @DecimalMin("0") @Column(precision = 12, scale = 2)
    private BigDecimal waterPerM3;
    @DecimalMin("0") @Column(precision = 12, scale = 2)
    private BigDecimal internetMonthly;
    @DecimalMin("0") @Column(precision = 12, scale = 2)
    private BigDecimal parkingMonthly;
    @DecimalMin("0") @Column(precision = 12, scale = 2)
    private BigDecimal serviceMonthly;
    @Min(1) @Max(12)
    private Integer paymentCycleMonths;
    @Size(max = 2000) @Column(length = 2000)
    private String houseRules;
    @Size(max = 2000) @Column(length = 2000)
    private String feeNotes;
}
