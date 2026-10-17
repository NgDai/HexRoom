package com.hexroom.backend.controller;

import com.hexroom.backend.common.ApiResponse;
import com.hexroom.backend.service.ImageStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.concurrent.TimeUnit;

@RestController @RequestMapping("/api/media/images") @RequiredArgsConstructor
public class ImageUploadController {
    private final ImageStorageService service;
    private final com.hexroom.backend.service.CloudinaryService cloudinaryService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('LANDLORD','MODERATOR','ADMIN')")
    public ResponseEntity<ApiResponse<ImageStorageService.StoredImage>> upload(@RequestPart("file") MultipartFile file) {
        if (cloudinaryService.isConfigured()) {
            try {
                java.util.Map<String, Object> result = cloudinaryService.upload(file, "hexroom/media");
                String url = (String) result.getOrDefault("secure_url", result.get("url"));
                int width = result.get("width") instanceof Number ? ((Number) result.get("width")).intValue() : 0;
                int height = result.get("height") instanceof Number ? ((Number) result.get("height")).intValue() : 0;
                long bytes = result.get("bytes") instanceof Number ? ((Number) result.get("bytes")).longValue() : file.getSize();
                return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(new ImageStorageService.StoredImage(url, width, height, bytes)));
            } catch (Exception ex) {
                // fallback to local
            }
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.store(file)));
    }
    @GetMapping("/{filename}")
    public ResponseEntity<Resource> image(@PathVariable String filename) {
        Resource resource = service.read(filename);
        return ResponseEntity.ok().contentType(filename.endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG)
                .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
                .header("X-Content-Type-Options", "nosniff").body(resource);
    }
}
