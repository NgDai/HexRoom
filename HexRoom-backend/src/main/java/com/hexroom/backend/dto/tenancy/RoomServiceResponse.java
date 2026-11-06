package com.hexroom.backend.dto.tenancy;

import com.hexroom.backend.entity.ContractServiceSubscription;
import com.hexroom.backend.entity.RoomService;

import java.math.BigDecimal;
import java.util.UUID;

/** Một dịch vụ của phòng kèm trạng thái đăng ký của hợp đồng hiện tại. */
public record RoomServiceResponse(
        UUID id,
        UUID roomId,
        String name,
        String category,
        BigDecimal unitPrice,
        String unit,
        String description,
        Boolean active,
        Boolean subscribed,
        UUID subscriptionId
) {

    public static RoomServiceResponse of(RoomService s, ContractServiceSubscription sub) {
        return new RoomServiceResponse(
                s.getId(),
                s.getRoom() != null ? s.getRoom().getId() : null,
                s.getName(),
                s.getCategory() != null ? s.getCategory().name() : null,
                s.getUnitPrice(),
                s.getUnit(),
                s.getDescription(),
                s.getActive(),
                sub != null && Boolean.TRUE.equals(sub.getSubscribed()),
                sub != null ? sub.getId() : null
        );
    }
}
