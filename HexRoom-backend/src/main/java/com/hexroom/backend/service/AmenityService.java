package com.hexroom.backend.service;

import com.hexroom.backend.dto.amenity.AmenityDto;
import com.hexroom.backend.entity.Amenity;
import com.hexroom.backend.exception.BadRequestException;
import com.hexroom.backend.exception.ResourceNotFoundException;
import com.hexroom.backend.repository.AmenityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AmenityService {

    private final AmenityRepository amenityRepository;

    @Transactional(readOnly = true)
    public List<AmenityDto> getAllAmenities() {
        return amenityRepository.findAll().stream()
                .map(AmenityDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AmenityDto getAmenityById(UUID id) {
        Amenity amenity = amenityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Amenity", "id", id));
        return AmenityDto.fromEntity(amenity);
    }

    @Transactional
    public AmenityDto createAmenity(String name) {
        if (name == null || name.isBlank()) {
            throw new BadRequestException("Tên tiện ích không được để trống", "AMENITY_NAME_REQUIRED");
        }

        String trimmedName = name.trim();
        if (amenityRepository.existsByNameIgnoreCase(trimmedName)) {
            throw new BadRequestException("Tiện ích này đã tồn tại", "AMENITY_EXISTS");
        }

        Amenity amenity = Amenity.builder()
                .name(trimmedName)
                .build();

        Amenity saved = amenityRepository.save(amenity);
        return AmenityDto.fromEntity(saved);
    }
}
