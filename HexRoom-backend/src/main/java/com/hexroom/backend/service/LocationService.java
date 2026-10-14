package com.hexroom.backend.service;

import com.hexroom.backend.dto.location.LocationDto;
import com.hexroom.backend.entity.Location;
import com.hexroom.backend.exception.ResourceNotFoundException;
import com.hexroom.backend.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;

    @Transactional(readOnly = true)
    public List<LocationDto> getAllLocations() {
        return locationRepository.findAll().stream()
                .map(LocationDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public LocationDto getLocationById(UUID id) {
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Location", "id", id));
        return LocationDto.fromEntity(location);
    }

    @Transactional
    public LocationDto createLocation(LocationDto dto) {
        Location location = Location.builder()
                .address(dto.getAddress().trim())
                .district(dto.getDistrict() != null ? dto.getDistrict().trim() : null)
                .city(dto.getCity() != null ? dto.getCity().trim() : null)
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .build();

        Location saved = locationRepository.save(location);
        return LocationDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<String> getCities() {
        return locationRepository.findDistinctCities();
    }

    @Transactional(readOnly = true)
    public List<String> getDistricts() {
        return locationRepository.findDistinctDistricts();
    }
}
