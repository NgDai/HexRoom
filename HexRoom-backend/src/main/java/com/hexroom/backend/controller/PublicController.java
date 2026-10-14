package com.hexroom.backend.controller;

import com.hexroom.backend.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
@Tag(name = "Public", description = "Endpoint công khai, kiểm tra trạng thái dịch vụ")
public class PublicController {

    @GetMapping("/health")
    @Operation(summary = "Kiểm tra tình trạng hoạt động của hệ thống (Health Check)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
        return ResponseEntity.ok(ApiResponse.success("Hệ thống HexRoom hoạt động bình thường", Map.of(
                "status", "UP",
                "timestamp", LocalDateTime.now(),
                "service", "HexRoom Spring Boot Backend"
        )));
    }
}
