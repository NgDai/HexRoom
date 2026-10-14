package com.hexroom.backend.dto.location;

import com.hexroom.backend.entity.Location;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationDto {

    private UUID id;

    @NotBlank(message = "Địa chỉ không được để trống")
    private String address;

    private String district;
    private String city;
    private Double latitude;
    private Double longitude;

    public static LocationDto fromEntity(Location location) {
        if (location == null) return null;
        return LocationDto.builder()
                .id(location.getId())
                .address(location.getAddress())
                .district(location.getDistrict())
                .city(location.getCity())
                .latitude(location.getLatitude())
                .longitude(location.getLongitude())
                .build();
    }
}
