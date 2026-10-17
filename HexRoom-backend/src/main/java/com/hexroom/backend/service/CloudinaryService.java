package com.hexroom.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;
    private final ImageStorageService localStorageService;

    @Value("${app.cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${app.cloudinary.api-key:}")
    private String apiKey;

    @Value("${app.cloudinary.api-secret:}")
    private String apiSecret;

    @Value("${app.cloudinary.url:}")
    private String cloudinaryUrl;

    public CloudinaryService(Cloudinary cloudinary, ImageStorageService localStorageService) {
        this.cloudinary = cloudinary;
        this.localStorageService = localStorageService;
    }

    /**
     * Kiểm tra xem Cloudinary đã được cấu hình đầy đủ thông tin xác thực hay chưa.
     */
    public boolean isConfigured() {
        boolean hasUrl = cloudinaryUrl != null && !cloudinaryUrl.isBlank();
        boolean hasCredentials = apiKey != null && !apiKey.isBlank() &&
                apiSecret != null && !apiSecret.isBlank() &&
                cloudName != null && !cloudName.isBlank();
        return hasUrl || hasCredentials;
    }

    /**
     * Tải file ảnh lên Cloudinary. Nếu chưa có credentials hoặc lỗi mạng, tự động fallback sang local storage.
     *
     * @param file   MultipartFile từ client
     * @param folder Thư mục trên Cloudinary (vd: "hexroom/avatars", "hexroom/rentals")
     * @return Map chứa URL và thông tin ảnh
     */
    public Map<String, Object> upload(MultipartFile file, String folder) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File tải lên không được để trống");
        }

        String targetFolder = (folder != null && !folder.isBlank()) ? folder : "hexroom";

        if (isConfigured()) {
            try {
                log.info("Đang tải ảnh lên Cloudinary (folder={}): {} (size={} bytes)",
                        targetFolder, file.getOriginalFilename(), file.getSize());

                Map<String, Object> params = ObjectUtils.asMap(
                        "folder", targetFolder,
                        "resource_type", "auto",
                        "use_filename", true,
                        "unique_filename", true
                );

                @SuppressWarnings("unchecked")
                Map<String, Object> uploadResult = cloudinary.uploader().upload(file.getBytes(), params);
                String secureUrl = (String) uploadResult.get("secure_url");
                log.info("Tải ảnh lên Cloudinary thành công: {}", secureUrl);
                return uploadResult;
            } catch (Exception ex) {
                log.warn("Không thể tải lên Cloudinary ({}), chuyển sang lưu trữ cục bộ: {}",
                        ex.getClass().getSimpleName(), ex.getMessage());
            }
        } else {
            log.info("Cloudinary chưa được cấu hình khóa API. Sử dụng hệ thống lưu trữ ảnh cục bộ.");
        }

        // Fallback: Local storage
        ImageStorageService.StoredImage stored = localStorageService.store(file);
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("url", stored.url());
        fallback.put("secure_url", stored.url());
        fallback.put("public_id", "local-" + UUID.randomUUID());
        fallback.put("width", stored.width());
        fallback.put("height", stored.height());
        fallback.put("bytes", stored.bytes());
        return fallback;
    }

    /**
     * Xóa ảnh trên Cloudinary theo public_id.
     */
    public boolean delete(String publicId) {
        if (!isConfigured() || publicId == null || publicId.startsWith("local-")) {
            return false;
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            return "ok".equals(result.get("result"));
        } catch (Exception ex) {
            log.warn("Lỗi khi xóa ảnh trên Cloudinary (publicId={}): {}", publicId, ex.getMessage());
            return false;
        }
    }
}
