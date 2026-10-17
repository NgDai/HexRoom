package com.hexroom.backend.controller;

import com.hexroom.backend.common.ApiResponse;
import com.hexroom.backend.service.CloudinaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@Tag(name = "Upload", description = "Tải ảnh và tài liệu lên Cloudinary")
public class UploadController {

    private final CloudinaryService cloudinaryService;

    @Operation(summary = "Tải ảnh thông thường lên Cloudinary (avatar, ảnh bài đăng)")
    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadImage(
            @RequestParam(value = "file", required = false) MultipartFile fileParam,
            @RequestPart(value = "file", required = false) MultipartFile filePart,
            @RequestParam(value = "folder", required = false, defaultValue = "hexroom/images") String folder
    ) throws IOException {
        MultipartFile file = fileParam != null ? fileParam : filePart;
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng chọn file ảnh hợp lệ"));
        }

        Map<String, Object> result = cloudinaryService.upload(file, folder);
        String url = (String) result.getOrDefault("secure_url", result.get("url"));

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("url", url);
        response.put("secure_url", url);
        response.put("public_id", result.get("public_id"));
        response.put("data", Map.of("url", url));
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Tải ảnh phòng trọ / nhà cho thuê lên Cloudinary")
    @PostMapping(value = "/rental-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadRentalImage(
            @RequestParam(value = "file", required = false) MultipartFile fileParam,
            @RequestPart(value = "file", required = false) MultipartFile filePart
    ) throws IOException {
        MultipartFile file = fileParam != null ? fileParam : filePart;
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng chọn file ảnh hợp lệ"));
        }

        Map<String, Object> result = cloudinaryService.upload(file, "hexroom/rentals");
        String url = (String) result.getOrDefault("secure_url", result.get("url"));

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("url", url);
        response.put("secure_url", url);
        response.put("public_id", result.get("public_id"));
        response.put("data", Map.of("url", url));
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Tải tài liệu pháp lý / CCCD lên Cloudinary")
    @PostMapping(value = "/document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadDocument(
            @RequestParam(value = "file", required = false) MultipartFile fileParam,
            @RequestPart(value = "file", required = false) MultipartFile filePart
    ) throws IOException {
        MultipartFile file = fileParam != null ? fileParam : filePart;
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng chọn file tài liệu hợp lệ"));
        }

        Map<String, Object> result = cloudinaryService.upload(file, "hexroom/documents");
        String url = (String) result.getOrDefault("secure_url", result.get("url"));

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("url", url);
        response.put("secure_url", url);
        response.put("public_id", result.get("public_id"));
        response.put("data", Map.of("url", url));
        return ResponseEntity.ok(response);
    }
}
