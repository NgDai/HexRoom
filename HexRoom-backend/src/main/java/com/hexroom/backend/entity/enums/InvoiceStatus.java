package com.hexroom.backend.entity.enums;

public enum InvoiceStatus {
    /** Hoá đơn đã lập, người thuê chưa xác nhận. */
    ISSUED,
    /** Người thuê đã xác nhận và báo đã chuyển tiền cho chủ trọ. */
    TENANT_CONFIRMED,
    /** Chủ trọ xác nhận đã nhận đủ tiền. */
    PAID,
    /** Quá hạn thanh toán và chưa được xác nhận. */
    OVERDUE,
    CANCELLED
}
