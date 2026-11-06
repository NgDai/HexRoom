package com.hexroom.backend.entity;

import com.hexroom.backend.entity.enums.ContractStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Hợp đồng thuê phòng giữa chủ trọ và người thuê.
 *
 * Hợp đồng do chủ trọ khởi tạo (DRAFT), gửi cho người thuê (PENDING_TENANT).
 * Người thuê chấp nhận -> PENDING_LANDLORD. Chủ trọ xác nhận -> ACTIVE.
 * Chỉ hợp đồng ACTIVE mới mở phòng phía người thuê và cho phép lập hoá đơn.
 */
@Entity
@Table(name = "rental_contracts", indexes = {
    @Index(name = "idx_contracts_room", columnList = "room_id"),
    @Index(name = "idx_contracts_tenant", columnList = "tenant_id"),
    @Index(name = "idx_contracts_landlord", columnList = "landlord_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RentalContract {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "contract_code", unique = true, length = 40)
    private String contractCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private User tenant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "landlord_id", nullable = false)
    private User landlord;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private ContractStatus status = ContractStatus.DRAFT;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "monthly_rent", nullable = false, precision = 12, scale = 2)
    private BigDecimal monthlyRent;

    @DecimalMin("0")
    @Column(name = "deposit_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal depositAmount = BigDecimal.ZERO;

    @Column(name = "payment_cycle_months")
    @Builder.Default
    private Integer paymentCycleMonths = 1;

    /** Ngày thanh toán cố định trong tháng (1-28). Hoá đơn được lập theo mốc này. */
    @Column(name = "billing_day")
    @Builder.Default
    private Integer billingDay = 5;

    @Column(name = "deposit_paid")
    @Builder.Default
    private Boolean depositPaid = false;

    @Column(name = "house_rules", columnDefinition = "TEXT")
    private String houseRules;

    @Column(name = "extra_terms", columnDefinition = "TEXT")
    private String extraTerms;

    @Column(name = "tenant_note", columnDefinition = "TEXT")
    private String tenantNote;

    @Column(name = "landlord_note", columnDefinition = "TEXT")
    private String landlordNote;

    @Column(name = "tenant_confirmed_at")
    private LocalDateTime tenantConfirmedAt;

    @Column(name = "landlord_confirmed_at")
    private LocalDateTime landlordConfirmedAt;

    @Column(name = "activated_at")
    private LocalDateTime activatedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "end_reason", length = 500)
    private String endReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Một hợp đồng chỉ sinh ra một phòng đang thuê; phòng mở khi hợp đồng ACTIVE. */
    public boolean isActive() {
        return status == ContractStatus.ACTIVE;
    }
}
