package com.hexroom.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Người thuê đăng ký sử dụng một dịch vụ của phòng trong hợp đồng đang hiệu lực.
 * Bỏ đăng ký không xoá bản ghi để giữ lịch sử tính tiền.
 */
@Entity
@Table(name = "contract_service_subscriptions", indexes = {
    @Index(name = "idx_subs_contract", columnList = "contract_id"),
    @Index(name = "idx_subs_service", columnList = "service_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_sub_contract_service", columnNames = {"contract_id", "service_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractServiceSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private RentalContract contract;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private RoomService service;

    @Column(name = "subscribed", nullable = false)
    @Builder.Default
    private Boolean subscribed = true;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "note", length = 500)
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
