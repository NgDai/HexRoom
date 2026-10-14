package com.hexroom.backend.controller;

import com.hexroom.backend.common.ApiResponse;
import com.hexroom.backend.dto.location.LocationDto;
import com.hexroom.backend.service.LocationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
@Tag(name = "Locations", description = "Quản lý vị trí, thành phố và quận huyện")
public class LocationController {

    private final LocationService locationService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả địa điểm")
    public ResponseEntity<ApiResponse<List<LocationDto>>> getAllLocations() {
        List<LocationDto> locations = locationService.getAllLocations();
        return ResponseEntity.ok(ApiResponse.success(locations));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết một địa điểm")
    public ResponseEntity<ApiResponse<LocationDto>> getLocation(@PathVariable UUID id) {
        LocationDto location = locationService.getLocationById(id);
        return ResponseEntity.ok(ApiResponse.success(location));
    }

    @GetMapping("/cities")
    @Operation(summary = "Lấy danh sách các thành phố có trên hệ thống")
    public ResponseEntity<ApiResponse<List<String>>> getCities() {
        List<String> cities = locationService.getCities();
        return ResponseEntity.ok(ApiResponse.success(cities));
    }

    @GetMapping("/districts")
    @Operation(summary = "Lấy danh sách các quận huyện có trên hệ thống")
    public ResponseEntity<ApiResponse<List<String>>> getDistricts() {
        List<String> districts = locationService.getDistricts();
        return ResponseEntity.ok(ApiResponse.success(districts));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    @Operation(summary = "Tạo mới một địa điểm")
    public ResponseEntity<ApiResponse<LocationDto>> createLocation(@Valid @RequestBody LocationDto dto) {
        LocationDto created = locationService.createLocation(dto);
        return new ResponseEntity<>(ApiResponse.success("Tạo địa điểm thành công", created), HttpStatus.CREATED);
    }
}
