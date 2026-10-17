package com.hexroom.backend.config;

import com.cloudinary.Cloudinary;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Configuration
public class CloudinaryConfig {

    @Value("${app.cloudinary.cloud-name:hexroom}")
    private String cloudName;

    @Value("${app.cloudinary.api-key:}")
    private String apiKey;

    @Value("${app.cloudinary.api-secret:}")
    private String apiSecret;

    @Value("${app.cloudinary.url:}")
    private String cloudinaryUrl;

    @Bean
    public Cloudinary cloudinary() {
        if (cloudinaryUrl != null && !cloudinaryUrl.isBlank()) {
            log.info("Khởi tạo Cloudinary với cấu hình CLOUDINARY_URL");
            return new Cloudinary(cloudinaryUrl.trim());
        }

        Map<String, String> config = new HashMap<>();
        config.put("cloud_name", (cloudName != null && !cloudName.isBlank()) ? cloudName.trim() : "hexroom");
        config.put("api_key", (apiKey != null) ? apiKey.trim() : "");
        config.put("api_secret", (apiSecret != null) ? apiSecret.trim() : "");
        config.put("secure", "true");

        if (apiKey != null && !apiKey.isBlank() && apiSecret != null && !apiSecret.isBlank()) {
            log.info("Khởi tạo Cloudinary thành công cho cloud_name: {}", cloudName);
        } else {
            log.info("Cloudinary khởi tạo ở chế độ dự phòng (chưa có API Key/Secret). Hệ thống sẽ tự động fallback sang local storage khi cần.");
        }

        return new Cloudinary(config);
    }
}
