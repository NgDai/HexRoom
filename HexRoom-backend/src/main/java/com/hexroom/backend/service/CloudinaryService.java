package com.hexroom.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.hexroom.backend.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class CloudinaryService {

    public static final long MAX_IMAGE_SIZE = 10 * 1024 * 1024L; // 10MB
    public static final long MAX_DOCUMENT_SIZE = 20 * 1024 * 1024L; // 20MB

    private static final Set<String> ALLOWED_IMAGE_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    private static final Set<String> ALLOWED_DOCUMENT_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf"
    );

    private static final Set<String> DANGEROUS_EXTENSIONS = Set.of(
            ".exe", ".bat", ".cmd", ".sh", ".php", ".js", ".jsp", ".jar", ".vbs", ".msi"
    );

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
     * Kiểm tra tính hợp lệ của file tải lên (MIME, dung lượng, extension).
     */
    public void validateFile(MultipartFile file, boolean isDocument) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File tải lên không được để trống");
        }

        long maxSize = isDocument ? MAX_DOCUMENT_SIZE : MAX_IMAGE_SIZE;
        String typeLabel = isDocument ? "Tài liệu" : "Ảnh";
        if (file.getSize() > maxSize) {
            throw new BadRequestException(typeLabel + " vượt quá dung lượng tối đa cho phép (" + (maxSize / (1024 * 1024)) + "MB)");
        }

        String filename = file.getOriginalFilename();
        if (filename != null) {
            String lower = filename.toLowerCase();
            for (String ext : DANGEROUS_EXTENSIONS) {
                if (lower.endsWith(ext)) {
                    throw new BadRequestException("Phần mở rộng file không được phép: " + ext);
                }
            }
        }

        String contentType = file.getContentType();
        Set<String> allowedTypes = isDocument ? ALLOWED_DOCUMENT_MIME_TYPES : ALLOWED_IMAGE_MIME_TYPES;
        if (contentType == null || !allowedTypes.contains(contentType.toLowerCase())) {
            throw new BadRequestException("Định dạng file không được hỗ trợ (" + contentType + "). Chỉ chấp nhận: " + String.join(", ", allowedTypes));
        }
    }

    /**
     * Tải file ảnh lên Cloudinary. Nếu chưa có credentials hoặc lỗi mạng, tự động fallback sang local storage.
     *
     * @param file   MultipartFile từ client
     * @param folder Thư mục trên Cloudinary (vd: "hexroom/avatars", "hexroom/rentals", "hexroom/documents")
     * @return Map chứa URL và thông tin ảnh
     */
    public Map<String, Object> upload(MultipartFile file, String folder) throws IOException {
        boolean isDocument = folder != null && folder.contains("document");
        validateFile(file, isDocument);

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

    /**
     * Dọn dẹp tài nguyên ảnh khi lưu database hoặc xử lý nghiệp vụ thất bại (compensation).
     */
    public void compensateUpload(String publicId) {
        if (publicId != null && !publicId.isBlank() && !publicId.startsWith("local-")) {
            try {
                boolean deleted = delete(publicId);
                if (deleted) {
                    log.info("Đã xóa bù (compensation) ảnh mồ côi trên Cloudinary: {}", publicId);
                } else {
                    log.warn("Không thể xóa bù ảnh trên Cloudinary (publicId={})", publicId);
                }
            } catch (Exception e) {
                log.error("Lỗi khi xóa bù ảnh trên Cloudinary (publicId={}): {}", publicId, e.getMessage());
            }
        }
    }
}
