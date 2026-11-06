package com.hexroom.backend.entity;

import com.hexroom.backend.entity.enums.InvoiceStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Hoá đơn tiền phòng + dịch vụ theo tháng của một hợp đồng.
 *
 * HexRoom không giữ tiền: người thuê xác nhận đã chuyển khoản cho chủ trọ,
 * chủ trọ xác nhận đã nhận tiền. Hệ thống chỉ ghi nhận trạng thái hai chiều này.
 */
@Entity
@Table(name = "rental_invoices", indexes = {
    @Index(name = "idx_invoices_contract", columnList = "contract_id"),
    @Index(name = "idx_invoices_status", columnList = "status")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_invoice_contract_period", columnNames = {"contract_id", "billing_year", "billing_month"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RentalInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "invoice_code", unique = true, length = 40)
    private String invoiceCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private RentalContract contract;

    @Column(name = "billing_month", nullable = false)
    private Integer billingMonth;

    @Column(name = "billing_year", nullable = false)
    private Integer billingYear;

    @Column(name = "room_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal roomAmount = BigDecimal.ZERO;

    @Column(name = "service_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal serviceAmount = BigDecimal.ZERO;

    @Column(name = "other_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal otherAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30)
    @Builder.Default
    private InvoiceStatus status = InvoiceStatus.ISSUED;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "note", length = 1000)
    private String note;

    @Column(name = "tenant_confirmed_at")
    private LocalDateTime tenantConfirmedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RentalInvoiceItem> items = new ArrayList<>();
}
