package com.hexroom.backend.dto.room;

import com.hexroom.backend.entity.Amenity;
import com.hexroom.backend.entity.Room;
import com.hexroom.backend.entity.RoomImage;
import com.hexroom.backend.entity.enums.RoomStatus;
import com.hexroom.backend.entity.enums.RoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomResponse {

    private UUID id;
    private UUID rentalId;
    private String roomName;
    private RoomType roomType;
    private BigDecimal price;
    private BigDecimal sizeM2;
    private Integer maxPeople;
    private String description;
    private com.hexroom.backend.entity.RoomCosts costs;
    private LocalDateTime availabilityConfirmedAt;
    private RoomStatus status;
    private Integer searchCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Rental summary details
    private String rentalTitle;
    private com.hexroom.backend.entity.enums.RentalStatus rentalStatus;
    private String address;
    private String district;
    private String city;

    @Builder.Default
    private List<String> images = new ArrayList<>();

    @Builder.Default
    private List<String> amenities = new ArrayList<>();

    public static RoomResponse fromEntity(Room room) {
        if (room == null) return null;

        List<String> imageUrls = room.getImages() != null
                ? room.getImages().stream().map(RoomImage::getImageUrl).collect(Collectors.toList())
                : new ArrayList<>();

        List<String> amenityNames = room.getAmenities() != null
                ? room.getAmenities().stream().map(Amenity::getName).collect(Collectors.toList())
                : new ArrayList<>();

        RoomResponse.RoomResponseBuilder builder = RoomResponse.builder()
                .id(room.getId())
                .roomName(room.getRoomName())
                .roomType(room.getRoomType())
                .price(room.getPrice())
                .sizeM2(room.getSizeM2())
                .maxPeople(room.getMaxPeople())
                .description(room.getDescription())
                .costs(room.getCosts())
                .availabilityConfirmedAt(room.getAvailabilityConfirmedAt())
                .status(room.getStatus())
                .searchCount(room.getSearchCount())
                .createdAt(room.getCreatedAt())
                .updatedAt(room.getUpdatedAt())
                .images(imageUrls)
                .amenities(amenityNames);

        if (room.getRental() != null) {
            builder.rentalId(room.getRental().getId());
            builder.rentalTitle(room.getRental().getTitle());
            builder.rentalStatus(room.getRental().getStatus());
            if (room.getRental().getLocation() != null) {
                builder.address(room.getRental().getLocation().getAddress());
                builder.district(room.getRental().getLocation().getDistrict());
                builder.city(room.getRental().getLocation().getCity());
            }
        }

        return builder.build();
    }
}
