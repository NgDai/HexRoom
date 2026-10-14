package com.hexroom.backend.dto.room;

import com.hexroom.backend.entity.enums.RoomStatus;
import com.hexroom.backend.entity.enums.RoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomFilterRequest {

    private UUID rentalId;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private BigDecimal minSize;
    private BigDecimal maxSize;
    private RoomType roomType;
    private RoomStatus status;
    private String district;
    private String city;
    private String keyword;
    private String sort;

    @Builder.Default
    private int page = 1;

    @Builder.Default
    private int limit = 10;
}
