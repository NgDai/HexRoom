package com.hexroom.backend.dto.amenity;

import com.hexroom.backend.entity.Amenity;
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
public class AmenityDto {

    private UUID id;

    @NotBlank(message = "Tên tiện ích không được để trống")
    private String name;

    public static AmenityDto fromEntity(Amenity amenity) {
        if (amenity == null) return null;
        return AmenityDto.builder()
                .id(amenity.getId())
                .name(amenity.getName())
                .build();
    }
}
