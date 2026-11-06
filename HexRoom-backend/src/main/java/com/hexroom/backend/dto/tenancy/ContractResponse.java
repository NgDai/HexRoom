package com.hexroom.backend.dto.tenancy;

import com.hexroom.backend.entity.RentalContract;
import com.hexroom.backend.entity.Room;
import com.hexroom.backend.entity.User;
import com.hexroom.backend.entity.enums.ContractStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/** Dữ liệu hợp đồng trả về cho cả hai phía. */
public record ContractResponse(
        UUID id,
        String contractCode,
        ContractStatus status,
        UUID roomId,
        String roomName,
        String roomType,
        UUID rentalId,
        String rentalTitle,
        String address,
        String district,
        String city,
        String roomImageUrl,
        UUID tenantId,
        String tenantName,
        String tenantEmail,
        String tenantPhone,
        String tenantAvatarUrl,
        UUID landlordId,
        String landlordName,
        String landlordEmail,
        String landlordPhone,
        String landlordAvatarUrl,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal monthlyRent,
        BigDecimal depositAmount,
        Integer paymentCycleMonths,
        Integer billingDay,
        Boolean depositPaid,
        String houseRules,
        String extraTerms,
        String tenantNote,
        String landlordNote,
        LocalDateTime tenantConfirmedAt,
        LocalDateTime landlordConfirmedAt,
        LocalDateTime activatedAt,
        LocalDateTime endedAt,
        String endReason,
        LocalDateTime createdAt,

        /** Tiện ích hiển thị dạng "VS-201 · P.302" trên thẻ "Phòng của tôi". */
        String roomLabel,
        /** Số ngày còn lại tới khi hết hạn (null nếu không có ngày kết thúc). */
        Long daysUntilEnd,
        /** Tổng tiền còn phải thanh toán (các hoá đơn chưa PAID). */
        BigDecimal outstandingAmount,
        long unpaidInvoiceCount
) {

    public static ContractResponse from(RentalContract c) {
        return from(c, BigDecimal.ZERO, 0L);
    }

    public static ContractResponse from(RentalContract c, BigDecimal outstandingAmount, long unpaidInvoiceCount) {
        Room room = c.getRoom();
        var rental = room != null ? room.getRental() : null;
        var location = rental != null ? rental.getLocation() : null;
        User tenant = c.getTenant();
        User landlord = c.getLandlord();

        String roomLabel = null;
        if (room != null) {
            String building = rental != null && rental.getTitle() != null ? rental.getTitle() : "";
            String name = room.getRoomName() != null && !room.getRoomName().isBlank()
                    ? room.getRoomName()
                    : (room.getRoomType() != null ? room.getRoomType().name() : "Phòng");
            roomLabel = name;
            if (!building.isBlank()) {
                roomLabel = name + " · " + building;
            }
        }

        Long daysUntilEnd = c.getEndDate() != null
                ? c.getEndDate().toEpochDay() - LocalDate.now().toEpochDay()
                : null;

        String roomImage = room != null && room.getImages() != null && !room.getImages().isEmpty()
                ? room.getImages().getFirst().getImageUrl()
                : null;

        return new ContractResponse(
                c.getId(),
                c.getContractCode(),
                c.getStatus(),
                room != null ? room.getId() : null,
                room != null ? room.getRoomName() : null,
                room != null && room.getRoomType() != null ? room.getRoomType().name() : null,
                rental != null ? rental.getId() : null,
                rental != null ? rental.getTitle() : null,
                location != null ? location.getAddress() : null,
                location != null ? location.getDistrict() : null,
                location != null ? location.getCity() : null,
                roomImage,
                tenant != null ? tenant.getId() : null,
                tenant != null ? tenant.getFullName() : null,
                tenant != null ? tenant.getEmail() : null,
                tenant != null ? tenant.getPhone() : null,
                tenant != null ? tenant.getAvatarUrl() : null,
                landlord != null ? landlord.getId() : null,
                landlord != null ? landlord.getFullName() : null,
                landlord != null ? landlord.getEmail() : null,
                landlord != null ? landlord.getPhone() : null,
                landlord != null ? landlord.getAvatarUrl() : null,
                c.getStartDate(),
                c.getEndDate(),
                c.getMonthlyRent(),
                c.getDepositAmount(),
                c.getPaymentCycleMonths(),
                c.getBillingDay(),
                c.getDepositPaid(),
                c.getHouseRules(),
                c.getExtraTerms(),
                c.getTenantNote(),
                c.getLandlordNote(),
                c.getTenantConfirmedAt(),
                c.getLandlordConfirmedAt(),
                c.getActivatedAt(),
                c.getEndedAt(),
                c.getEndReason(),
                c.getCreatedAt(),
                roomLabel,
                daysUntilEnd,
                outstandingAmount,
                unpaidInvoiceCount
        );
    }
}
