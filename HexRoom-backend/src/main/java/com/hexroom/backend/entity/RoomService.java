package com.hexroom.backend.entity;

import com.hexroom.backend.entity.enums.ServiceCategory;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Dịch vụ đi kèm một phòng (điện, nước, internet, giữ xe...).
 *
 * Chủ trọ khai báo trên phòng; người thuê đăng ký/bỏ đăng ký trên hợp đồng đang hiệu lực.
 * Đơn giá để trống (null) nghĩa là "chưa xác định", không được hiệu lực như 0.
 */
@Entity
@Table(name = "room_services", indexes = {
    @Index(name = "idx_room_services_room", columnList = "room_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomService {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 30)
    @Builder.Default
    private ServiceCategory category = ServiceCategory.OTHER;

    @DecimalMin("0")
    @Column(name = "unit_price", precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "unit", length = 30)
    private String unit;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "active")
    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
