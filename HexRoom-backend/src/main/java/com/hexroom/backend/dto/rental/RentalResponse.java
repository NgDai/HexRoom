package com.hexroom.backend.dto.rental;

import com.hexroom.backend.dto.auth.UserSummaryDto;
import com.hexroom.backend.dto.location.LocationDto;
import com.hexroom.backend.dto.room.RoomResponse;
import com.hexroom.backend.entity.Rental;
import com.hexroom.backend.entity.RentalImage;
import com.hexroom.backend.entity.enums.RentalStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RentalResponse {

    private UUID id;
    private UserSummaryDto owner;
    private LocationDto location;
    private String title;
    private String description;
    private RentalStatus status;
    private LocalDateTime createdAt;

    @Builder.Default
    private List<String> images = new ArrayList<>();

    @Builder.Default
    private List<RoomResponse> rooms = new ArrayList<>();

    public static RentalResponse fromEntity(Rental rental) {
        if (rental == null) return null;

        List<String> imageUrls = rental.getImages() != null
                ? rental.getImages().stream().map(RentalImage::getImageUrl).collect(Collectors.toList())
                : new ArrayList<>();

        List<RoomResponse> roomResponses = rental.getRooms() != null
                ? rental.getRooms().stream().map(RoomResponse::fromEntity).collect(Collectors.toList())
                : new ArrayList<>();

        return RentalResponse.builder()
                .id(rental.getId())
                .owner(UserSummaryDto.fromEntity(rental.getOwner()))
                .location(LocationDto.fromEntity(rental.getLocation()))
                .title(rental.getTitle())
                .description(rental.getDescription())
                .status(rental.getStatus())
                .createdAt(rental.getCreatedAt())
                .images(imageUrls)
                .rooms(roomResponses)
                .build();
    }

    public static RentalResponse publicView(Rental rental) {
        RentalResponse response = fromEntity(rental);
        response.setOwner(null);
        response.setRooms(response.getRooms().stream()
                .filter(room -> room.getStatus() == com.hexroom.backend.entity.enums.RoomStatus.AVAILABLE).toList());
        return response;
    }
}
