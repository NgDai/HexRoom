package com.hexroom.backend.service;

import com.hexroom.backend.exception.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.*;
import javax.imageio.stream.ImageInputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.*;

@Service
public class ImageStorageService {
    private final Path directory;
    private final String publicBase;
    public ImageStorageService(@Value("${app.media.directory:.data/uploads}") String directory,
            @Value("${app.media.public-base-url:http://localhost:${server.port:8080}}") String publicBase) {
        this.directory = Path.of(directory).toAbsolutePath().normalize();
        this.publicBase = publicBase.replaceAll("/+$", "");
    }
    public record StoredImage(String url, int width, int height, long bytes) {}
    public StoredImage store(MultipartFile file) {
        if (file.isEmpty() || file.getSize() > 8 * 1024 * 1024) throw new BadRequestException("Chọn ảnh JPEG hoặc PNG có dung lượng tối đa 8 MB");
        try (InputStream source = file.getInputStream(); ImageInputStream input = ImageIO.createImageInputStream(source)) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new BadRequestException("File không phải ảnh JPEG/PNG hợp lệ");
            ImageReader reader = readers.next();
            BufferedImage original;
            String format;
            try {
                reader.setInput(input, true, true); format = reader.getFormatName().toLowerCase(Locale.ROOT);
                if (!Set.of("jpeg", "jpg", "png").contains(format)) throw new BadRequestException("Chỉ hỗ trợ JPEG và PNG");
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width < 1 || height < 1 || (long) width * height > 20_000_000 || width > 12000 || height > 12000)
                    throw new BadRequestException("Ảnh quá lớn. Vui lòng chọn ảnh không quá 20 megapixel");
                original = reader.read(0);
            } finally { reader.dispose(); }
            double scale = Math.min(1, 2560.0 / Math.max(original.getWidth(), original.getHeight()));
            int width = Math.max(1, (int) (original.getWidth() * scale)), height = Math.max(1, (int) (original.getHeight() * scale));
            boolean png = format.equals("png");
            BufferedImage clean = new BufferedImage(width, height, png ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = clean.createGraphics();
            try { graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC); graphics.drawImage(original, 0, 0, width, height, null); }
            finally { graphics.dispose(); original.flush(); }
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            // Re-encoding discards uploaded filenames and EXIF/GPS metadata.
            ImageIO.write(clean, png ? "png" : "jpg", output); clean.flush();
            byte[] bytes = output.toByteArray();
            if (bytes.length > 16 * 1024 * 1024) throw new BadRequestException("Ảnh sau xử lý quá lớn. Hãy giảm kích thước ảnh");
            Files.createDirectories(directory);
            String name = UUID.randomUUID() + (png ? ".png" : ".jpg");
            Files.write(directory.resolve(name), bytes, StandardOpenOption.CREATE_NEW);
            return new StoredImage(publicBase + "/api/media/images/" + name, width, height, bytes.length);
        } catch (BadRequestException ex) { throw ex; }
        catch (IOException | IllegalArgumentException ex) { throw new BadRequestException("Không đọc hoặc lưu được ảnh. Vui lòng chọn file khác hoặc thử lại"); }
    }
    public Resource read(String name) {
        if (!name.matches("[a-f0-9-]{36}\\.(jpg|png)")) throw new ResourceNotFoundException("Ảnh", "file", name);
        Path path = directory.resolve(name).normalize();
        if (!path.startsWith(directory) || !Files.isRegularFile(path)) throw new ResourceNotFoundException("Ảnh", "file", name);
        return new FileSystemResource(path);
    }
}
