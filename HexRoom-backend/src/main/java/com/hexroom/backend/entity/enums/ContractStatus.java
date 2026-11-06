package com.hexroom.backend.entity.enums;

/**
 * Vòng đời hợp đồng thuê phòng.
 *
 * DRAFT -> PENDING_TENANT -> PENDING_LANDLORD -> ACTIVE -> ENDED
 *                                   |                |
 *                                   +-> REJECTED     +-> CANCELLED
 *
 * Hợp đồng chỉ chuyển sang ACTIVE khi CẢ HAI bên đã xác nhận và chủ trọ xác nhận
 * đã nhận tiền cọc. Chỉ khi đó phòng mới xuất hiện trong "Phòng của tôi" của người thuê.
 */
public enum ContractStatus {
    DRAFT,
    PENDING_TENANT,
    PENDING_LANDLORD,
    ACTIVE,
    REJECTED,
    CANCELLED,
    ENDED
}
