package com.hexroom.backend.config;

import com.hexroom.backend.entity.*;
import com.hexroom.backend.entity.enums.RentalStatus;
import com.hexroom.backend.entity.enums.RoomStatus;
import com.hexroom.backend.entity.enums.RoomType;
import com.hexroom.backend.entity.enums.UserRole;
import com.hexroom.backend.entity.enums.UserStatus;
import com.hexroom.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final RentalRepository rentalRepository;
    private final RoomRepository roomRepository;
    private final AmenityRepository amenityRepository;
    private final PasswordEncoder passwordEncoder;
    private final LifestyleProfileRepository lifestyleProfileRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final RoommateProfileRepository roommateProfileRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        log.info("Starting HexRoom Data Seeder for accounts, landlords, listings, and roommates...");

        try {
            // Fix PostgreSQL check constraint users_role_check if needed
            try {
                jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
                jdbcTemplate.execute("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'LANDLORD', 'TENANT', 'GUEST', 'MODERATOR', 'INSPECTOR'))");
                log.info("Cập nhật constraint users_role_check thành công");
            } catch (Exception ex) {
                log.warn("Lưu ý cập nhật constraint users_role_check: {}", ex.getMessage());
            }

            // 1. Seed base amenities
            List<String> amenityNames = List.of(
                    "Máy lạnh", "Tủ lạnh", "Máy giặt riêng", "Gác lửng",
                    "Ban công", "Thang máy", "Khóa vân tay", "Bếp riêng",
                    "Bãi giữ xe", "Wifi tốc độ cao", "Bảo vệ 24/7"
            );
            Map<String, Amenity> amenityMap = new HashMap<>();
            for (String name : amenityNames) {
                try {
                    Amenity amenity = amenityRepository.findByNameIgnoreCase(name)
                            .orElseGet(() -> amenityRepository.save(Amenity.builder().name(name).build()));
                    amenityMap.put(name, amenity);
                } catch (Exception ex) {
                    log.warn("Lưu ý amenity '{}': {}", name, ex.getMessage());
                }
            }

            // 2. Seed Base System Users (Admins, Inspectors, Default Landlords)
            User defaultLandlord = seedOrUpdateLandlord(
                    "landlord@hexroom.vn",
                    "Nguyễn Văn Thắng (Chủ trọ HexRoom)",
                    "0908123456",
                    "Nam",
                    "079098123456",
                    "2021-05-15",
                    "Cục CSQLHC về TTXH",
                    "72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP. Hồ Chí Minh",
                    "1988-08-20",
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"
            );

            seedOrUpdateAdmin("admin@hexroom.vn", "Trịnh Hoàng Minh (Quản trị Admin)", "123456");
            seedOrUpdateAdmin("admin@gmail.com", "Hệ Thống Quản Trị (Admin)", "123456");

            try {
                userRepository.findByEmail("inspector@hexroom.vn")
                        .orElseGet(() -> userRepository.save(User.builder()
                                .email("inspector@hexroom.vn")
                                .fullName("Lê Trọng Đạt (Kiểm định viên)")
                                .passwordHash(passwordEncoder.encode("123456"))
                                .phone("0933221100")
                                .avatarUrl("https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400")
                                .role(UserRole.MODERATOR)
                                .status(UserStatus.ACTIVE)
                                .gender("Nam")
                                .isVip(false)
                                .build()));
            } catch (Exception ex) {
                log.warn("Lưu ý inspector: {}", ex.getMessage());
            }

            // 3. Seed Landlords
            User gioLandlord = seedOrUpdateLandlord(
                    "gioedm6@gmail.com", "Hoàng Thanh Huy", "0983749273", "Nam", "079098374927",
                    "2021-06-12", "Cục Cảnh sát QLHC về TTXH", "188 Nguyễn Xí, Phường 26, Quận Bình Thạnh, TP. Hồ Chí Minh",
                    "1992-10-15", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
            );

            User lanLandlord = seedOrUpdateLandlord(
                    "lan.tran@hexroom.vn", "Trần Thị Ngọc Lan (Cô Lan Chủ trọ)", "0903112233", "Nữ", "079178001122",
                    "2020-04-10", "Cục Cảnh sát QLHC về TTXH", "452/8 Sư Vạn Hạnh, Phường 12, Quận 10, TP. Hồ Chí Minh",
                    "1978-04-12", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400"
            );

            User haiLandlord = seedOrUpdateLandlord(
                    "hai.nguyen@hexroom.vn", "Nguyễn Văn Hải (Hải BĐS Tân Bình)", "0938445566", "Nam", "079185003344",
                    "2021-08-19", "Cục Cảnh sát QLHC về TTXH", "36 Bạch Đằng, Phường 2, Quận Tân Bình, TP. Hồ Chí Minh",
                    "1985-11-20", "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400"
            );

            User phuongLandlord = seedOrUpdateLandlord(
                    "phuong.doan@hexroom.vn", "Đoàn Mai Phương (HexHome Thủ Đức)", "0919778899", "Nữ", "079190005566",
                    "2022-02-14", "Cục Cảnh sát QLHC về TTXH", "25 Khu Phố 6, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh",
                    "1990-09-14", "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400"
            );

            User namLandlord = seedOrUpdateLandlord(
                    "nam.le@hexroom.vn", "Lê Hoàng Nam (HexLiving Quận 7 & Quận 1)", "0909556677", "Nam", "079186007788",
                    "2019-11-05", "Cục Cảnh sát QLHC về TTXH", "88 Đường số 7, KDC Him Lam, Tân Hưng, Quận 7, TP. Hồ Chí Minh",
                    "1982-05-10", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400"
            );

            User tramLandlord = seedOrUpdateLandlord(
                    "tram.vu@hexroom.vn", "Vũ Ngọc Trâm (Trâm BĐS Gò Vấp & Phú Nhuận)", "0932889900", "Nữ", "079192004455",
                    "2021-04-18", "Cục Cảnh sát QLHC về TTXH", "142 Phan Văn Trị, Phường 10, Quận Gò Vấp, TP. Hồ Chí Minh",
                    "1989-12-08", "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400"
            );

            // 4. Seed Bạn cùng phòng
            seedOrUpdateTenant("nguyendai2412005@gmail.com", "Nguyễn Quốc Đại", "0909241205", "Nam", "2005-12-24", "079205012412", "2023-01-10", "45/12 Kha Vạn Cân, Linh Trung, TP. Thủ Đức", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400", "Đại Quốc", new BigDecimal("2000000"), new BigDecimal("4500000"), false, false, "07:00", "23:00", "Sinh viên CNTT / Lập trình viên", List.of("Công nghệ", "Game", "Bóng đá"));
            seedOrUpdateTenant("manhlk631@gmail.com", "Lê Kim Mạnh", "0918631631", "Nam", "2003-05-18", "079203006631", "2022-03-20", "128 Cách Mạng Tháng 8, Phường 10, Quận 3", "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400", "Mạnh Lê", new BigDecimal("2500000"), new BigDecimal("5000000"), false, true, "06:30", "23:30", "Nhân viên văn phòng / Kế toán", List.of("Đọc sách", "Chạy bộ", "Nuôi mèo"));
            seedOrUpdateTenant("thikhuyen098@gmail.com", "Nguyễn Thị Khuyên", "0977098098", "Nữ", "2004-09-08", "079304008098", "2022-08-15", "89 Phan Văn Trị, Phường 11, Quận Bình Thạnh", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400", "Khuyên Nguyễn", new BigDecimal("1800000"), new BigDecimal("4000000"), false, false, "06:00", "22:30", "Sinh viên ĐH Ngoại Thương", List.of("Nấu ăn", "Âm nhạc", "Học tiếng Anh"));
            seedOrUpdateTenant("quocanh.dev@gmail.com", "Nguyễn Quốc Anh", "0912112233", "Nam", "2001-03-15", "079201001122", "2021-09-10", "148 Nguyễn Xí, Phường 26, Quận Bình Thạnh", "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400", "Quốc Anh Dev", new BigDecimal("3500000"), new BigDecimal("5500000"), false, false, "07:30", "00:00", "Kỹ sư phần mềm Fullstack", List.of("Lập trình", "Guitar", "Cà phê", "Gym"));
            seedOrUpdateTenant("thuthao.design@gmail.com", "Lê Thị Thu Thảo", "0934556677", "Nữ", "2002-07-22", "079202003344", "2022-04-12", "320 Sư Vạn Hạnh, Phường 9, Quận 10", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400", "Thảo Thảo UI", new BigDecimal("3000000"), new BigDecimal("4800000"), false, true, "07:00", "23:30", "UI/UX Designer", List.of("Vẽ tranh", "Thiết kế", "Nhiếp ảnh", "Yêu cún"));
            seedOrUpdateTenant("khoa.bku@gmail.com", "Trần Minh Khoa", "0908778899", "Nam", "2003-11-04", "079203009988", "2022-10-05", "12 Đường số 6, Linh Trung, TP. Thủ Đức", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400", "Khoa Bách Khoa", new BigDecimal("2000000"), new BigDecimal("3500000"), false, false, "06:30", "23:00", "Sinh viên ĐH Bách Khoa", List.of("Robotics", "Cầu lông", "Đi phượt"));
            seedOrUpdateTenant("ngoclan.mkt@gmail.com", "Phạm Ngọc Lan", "0966334455", "Nữ", "2000-05-19", "079200005566", "2020-08-20", "215 Nam Kỳ Khởi Nghĩa, Phường 7, Quận 3", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400", "Ngọc Lan MKT", new BigDecimal("4000000"), new BigDecimal("6500000"), false, false, "07:00", "23:00", "Chuyên viên Marketing & Truyền thông", List.of("Yoga", "Du lịch", "Podcasts", "Làm bánh"));
            seedOrUpdateTenant("baodang.audit@gmail.com", "Đặng Quốc Bảo", "0988223344", "Nam", "1999-08-30", "079199007788", "2019-12-15", "68 Pasteur, Bến Nghé, Quận 1", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400", "Bảo Audit", new BigDecimal("4500000"), new BigDecimal("7000000"), false, false, "07:00", "00:30", "Kiểm toán viên Big4", List.of("Bơi lội", "Đầu tư", "Sách tài chính"));
            seedOrUpdateTenant("hoangmai.pharma@gmail.com", "Nguyễn Hoàng Mai", "0971445566", "Nữ", "2001-12-10", "079201004455", "2021-11-25", "105 An Dương Vương, Phường 8, Quận 5", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400", "Mai Dược", new BigDecimal("3000000"), new BigDecimal("4500000"), false, false, "06:00", "22:30", "Dược sĩ Bệnh viện ĐHYD", List.of("Chăm sóc sức khỏe", "Trồng cây", "Nấu ăn"));
            seedOrUpdateTenant("yennhi.hoang@gmail.com", "Hoàng Yến Nhi", "0903889911", "Nữ", "2003-02-14", "079203001122", "2023-03-01", "KDC Him Lam, Tân Hưng, Quận 7", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400", "Yến Nhi Jenny", new BigDecimal("4500000"), new BigDecimal("7500000"), false, true, "07:30", "23:30", "Du học sinh / Trợ lý Giám đốc", List.of("Ngoại ngữ", "Thời trang", "Pilates", "Thú cưng"));

            // 5. Seed Phòng Trọ & Căn Hộ
            createRentalAndRoomWithStatus(
                    gioLandlord, "Tòa nhà HexRoom Residence Nguyễn Xí Bình Thạnh", "188/15 Nguyễn Xí, Phường 26", "Quận Bình Thạnh", "Hồ Chí Minh",
                    "Căn hộ Studio Ban Công Thoáng Sáng — Gần ĐH Ngoại Thương & HUTECH",
                    "Phòng Studio 35m² mới xây 100%, có ban công riêng view Landmark 81 cực đẹp. Đầy đủ tiện nghi: máy lạnh Inverter, tủ lạnh 2 cánh, máy giặt riêng, giường nệm cao cấp, bàn làm việc, tủ bếp gỗ sồi. Giờ giấc tự do, bảo vệ 24/7.",
                    RoomType.STUDIO, new BigDecimal("5500000"), new BigDecimal("35.0"), 2,
                    createCosts("5500000", "3800", "20000", "100000", "120000", "150000", "Giữ gìn vệ sinh chung, không ồn ào sau 23h."),
                    List.of("https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200", "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Máy giặt riêng"), amenityMap.get("Ban công"), amenityMap.get("Thang máy"), amenityMap.get("Khóa vân tay")),
                    RoomStatus.AVAILABLE
            );

            createRentalAndRoomWithStatus(
                    gioLandlord, "Khu Căn Hộ Mini Hoàng Thanh Huy Đinh Bộ Lĩnh", "92 Đinh Bộ Lĩnh, Phường 26", "Quận Bình Thạnh", "Hồ Chí Minh",
                    "Phòng Gác Lửng Đúc Full Nội Thất — Ngay Bến Xe Miền Đông",
                    "Phòng trọ gác lửng đúc kiên cố cao ráo không đụng đầu, ban công riêng đón gió mát. Có sẵn máy lạnh, tủ quần áo, kệ bếp, WC khép kín thiết bị cao cấp. Cổng khóa vân tay, camera giám sát 24/24.",
                    RoomType.PRIVATE, new BigDecimal("3800000"), new BigDecimal("26.0"), 2,
                    createCosts("3800000", "3600", "18000", "80000", "100000", "100000", "Ra vào vân tay, an ninh tuyệt đối."),
                    List.of("https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200", "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200", "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Gác lửng"), amenityMap.get("Khóa vân tay"), amenityMap.get("Bãi giữ xe")),
                    RoomStatus.AVAILABLE
            );

            createRentalAndRoomWithStatus(
                    lanLandlord, "Căn hộ Dịch vụ HexHome Bình Thạnh", "124/18 Xô Viết Nghệ Tĩnh, Phường 21", "Quận Bình Thạnh", "Hồ Chí Minh",
                    "Studio Ban Công Thoáng Mát P.302 — Giáp Quận 1 chỉ 3 Phút",
                    "Căn hộ dịch vụ cao cấp ngay cửa ngõ Quận 1. Ban công view sông thoáng đãng, nội thất gỗ sồi cao cấp, thang máy thẻ từ, máy giặt riêng từng phòng. Miễn phí dọn dẹp vệ sinh phòng 2 lần/tuần.",
                    RoomType.STUDIO, new BigDecimal("5200000"), new BigDecimal("30.0"), 2,
                    createCosts("5200000", "3800", "22000", "100000", "120000", "150000", "Không nuôi thú cưng lớn. Hút thuốc ngoài ban công."),
                    List.of("https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200", "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Ban công"), amenityMap.get("Thang máy"), amenityMap.get("Máy giặt riêng")),
                    RoomStatus.AVAILABLE
            );

            createRentalAndRoomWithStatus(
                    defaultLandlord, "Tòa nhà căn hộ dịch vụ HexHouse Bình Thạnh", "152/24 Nguyễn Gia Trí (D2 cũ)", "Quận Bình Thạnh", "Hồ Chí Minh",
                    "Studio Ban Công Thoáng Mát — Full Nội Thất Cao Cấp D2",
                    "Phòng Studio rộng 35m² mới 100%, có ban công riêng view Landmark 81 cực đẹp. Đầy đủ tiện nghi: máy lạnh Inverter, tủ lạnh 2 cánh, máy giặt riêng, giường nệm cao cấp, bàn làm việc, tủ bếp gỗ sồi.",
                    RoomType.STUDIO, new BigDecimal("4900000"), new BigDecimal("32.0"), 2,
                    createCosts("4900000", "3800", "20000", "100000", "120000", "150000", "Giữ gìn vệ sinh chung, không làm ồn sau 23h."),
                    List.of("https://images.unsplash.com/photo-1502005229762-ee152da915ba?w=1200", "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200", "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Máy giặt riêng"), amenityMap.get("Ban công"), amenityMap.get("Thang máy"), amenityMap.get("Khóa vân tay")),
                    RoomStatus.AVAILABLE
            );

            createRentalAndRoomWithStatus(
                    lanLandlord, "Nhà trọ Cao cấp HexRoom Quận 10", "452/8 Sư Vạn Hạnh, Phường 12", "Quận 10", "Hồ Chí Minh",
                    "Phòng Duplex Gác Lửng Trần Cao P.105 — Sát ĐH Huflit & Vạn Hạnh Mall",
                    "Phòng duplex gác đúc trần cao 4m thoáng đãng, thiết kế hiện đại sang trọng. Đầy đủ tiện nghi: máy lạnh Daikin, tủ lạnh, bếp riêng, máy nước nóng. Khu vực sầm uất trung tâm Quận 10, an ninh tuyệt đối.",
                    RoomType.PRIVATE, new BigDecimal("4800000"), new BigDecimal("28.0"), 2,
                    createCosts("4800000", "3900", "20000", "100000", "150000", "120000", "Giữ trật tự chung, xe để đúng vị trí."),
                    List.of("https://images.unsplash.com/photo-1502005229762-ee152da915ba?w=1200", "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=1200", "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Gác lửng"), amenityMap.get("Bếp riêng"), amenityMap.get("Khóa vân tay")),
                    RoomStatus.AVAILABLE
            );

            // PHÒNG ĐÃ THUÊ (RENTED) QUẬN 10
            createRentalAndRoomWithStatus(
                    lanLandlord, "Nhà Trọ Sinh Viên Tô Hiến Thành", "280/14 Tô Hiến Thành, Phường 14", "Quận 10", "Hồ Chí Minh",
                    "Phòng Đơn Khép Kín Gần ĐH Bách Khoa — Tô Hiến Thành Quận 10",
                    "Phòng trọ yên tĩnh, có gác lửng, WC riêng, gần ĐH Bách Khoa TP.HCM. Phòng này hiện đã có khách ký hợp đồng thuê dài hạn 1 năm.",
                    RoomType.PRIVATE, new BigDecimal("3500000"), new BigDecimal("22.0"), 2,
                    createCosts("3500000", "3800", "18000", "80000", "120000", "80000", "Hợp đồng đã ký. Đã bàn giao chìa khóa."),
                    List.of("https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200", "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Gác lửng"), amenityMap.get("Khóa vân tay")),
                    RoomStatus.RENTED
            );

            createRentalAndRoomWithStatus(
                    namLandlord, "HexLuxury Penthouse & Studio Bến Nghé", "28 Thi Sách, Phường Bến Nghé", "Quận 1", "Hồ Chí Minh",
                    "Căn Hộ Studio Cao Cấp View Landmark 81 & Sông Sài Gòn — Trung Tâm Q1",
                    "Căn hộ studio cao cấp nằm tại trung tâm Quận 1, cách phố đi bộ Nguyễn Huệ 500m. Nội thất nhập khẩu phong cách Indochine hiện đại, ban công rộng view panorama sông Sài Gòn. Thang máy thẻ từ, bảo vệ 24/7, hồ bơi sân thượng.",
                    RoomType.STUDIO, new BigDecimal("8500000"), new BigDecimal("42.0"), 2,
                    createCosts("8500000", "4200", "25000", "150000", "200000", "250000", "An ninh cao cấp, cư dân văn minh, không tiệc tùng quá khuya."),
                    List.of("https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200", "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Máy giặt riêng"), amenityMap.get("Ban công"), amenityMap.get("Thang máy"), amenityMap.get("Khóa vân tay"), amenityMap.get("Bảo vệ 24/7")),
                    RoomStatus.AVAILABLE
            );

            createRentalAndRoomWithStatus(
                    lanLandlord, "Tòa Nhà Duplex Tri Thức Cách Mạng Tháng 8", "210/12 Cách Mạng Tháng 8, Phường 10", "Quận 3", "Hồ Chí Minh",
                    "Căn Hộ Duplex Trần Cao 4m Giáp Quận 1 — Giờ Giấc Tự Do An Ninh",
                    "Căn hộ thiết kế duplex gác cao sang trọng, cửa sổ kính lớn đón ánh sáng tự nhiên. Tủ lạnh 2 cánh, bếp từ âm, máy giặt riêng trong phòng. Vị trí trung tâm Quận 3 thuận tiện di chuyển sang Quận 1, 10, Phú Nhuận chỉ 5 phút.",
                    RoomType.STUDIO, new BigDecimal("5800000"), new BigDecimal("32.0"), 2,
                    createCosts("5800000", "3900", "22000", "100000", "150000", "150000", "Giờ tự do 24/7, bãi giữ xe rộng rãi."),
                    List.of("https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=1200", "https://images.unsplash.com/photo-1502005229762-ee152da915ba?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Máy giặt riêng"), amenityMap.get("Ban công"), amenityMap.get("Bếp riêng"), amenityMap.get("Khóa vân tay")),
                    RoomStatus.AVAILABLE
            );

            createRentalAndRoomWithStatus(
                    namLandlord, "Chung Cư Mini HexHome Him Lam", "88 Đường số 7, KDC Him Lam, Phường Tân Hưng", "Quận 7", "Hồ Chí Minh",
                    "Căn Hộ Dịch Vụ Mini Sát ĐH Tôn Đức Thắng & Lotte Mart Quận 7",
                    "Chung cư mini cao cấp trong khu đô thị Him Lam yên tĩnh, văn minh. Đầy đủ nội thất: giường nệm lò xo cao cấp, sofa tiếp khách, máy lạnh, tủ lạnh, bếp riêng. Cách ĐH Tôn Đức Thắng và ĐH Cảnh Sát chỉ 3 phút đi xe.",
                    RoomType.APARTMENT, new BigDecimal("6200000"), new BigDecimal("38.0"), 2,
                    createCosts("6200000", "3800", "20000", "100000", "150000", "180000", "An ninh tuyệt đối, camera 24/24, không gian yên tĩnh học tập."),
                    List.of("https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200", "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Máy giặt riêng"), amenityMap.get("Ban công"), amenityMap.get("Thang máy"), amenityMap.get("Khóa vân tay"), amenityMap.get("Bảo vệ 24/7")),
                    RoomStatus.AVAILABLE
            );

            // PHÒNG ĐÃ THUÊ (RENTED) QUẬN 7
            createRentalAndRoomWithStatus(
                    namLandlord, "Khu Căn Hộ Dịch Vụ Sky Garden Phú Mỹ Hưng", "Khu Sky Garden 3, Phường Tân Phong", "Quận 7", "Hồ Chí Minh",
                    "Studio Ban Công Xanh Sky Garden 3 — Phú Mỹ Hưng Quận 7",
                    "Căn hộ Studio thoáng mát view công viên cây xanh nội khu Phú Mỹ Hưng. Phòng này đã có chuyên gia nước ngoài đặt cọc và ký hợp đồng thuê 2 năm.",
                    RoomType.STUDIO, new BigDecimal("7500000"), new BigDecimal("40.0"), 2,
                    createCosts("7500000", "4000", "22000", "120000", "180000", "200000", "Phòng đã có người thuê. Tạm khóa nhận lịch hẹn."),
                    List.of("https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Ban công"), amenityMap.get("Thang máy")),
                    RoomStatus.RENTED
            );

            createRentalAndRoomWithStatus(
                    haiLandlord, "HexApartment Sân Bay Tân Sơn Nhất", "36 Bạch Đằng, Phường 2", "Quận Tân Bình", "Hồ Chí Minh",
                    "Studio Sang Trọng Liền Kề Sân Bay — Full Đồ Điện Máy Cao Cấp",
                    "Căn hộ Studio vị trí đắc địa cách sân bay Tân Sơn Nhất chỉ 500m. Thích hợp cho tiếp viên hàng không, phi công, chuyên gia hoặc nhân viên văn phòng. Tiện ích đẳng cấp: giường King size, tivi thông minh, máy giặt sấy, khóa cửa thông minh.",
                    RoomType.STUDIO, new BigDecimal("6200000"), new BigDecimal("35.0"), 2,
                    createCosts("6200000", "4000", "25000", "120000", "150000", "200000", "Hợp đồng từ 6 tháng. Giờ giấc tự do 24/7."),
                    List.of("https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200", "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Thang máy"), amenityMap.get("Khóa vân tay"), amenityMap.get("Bảo vệ 24/7")),
                    RoomStatus.AVAILABLE
            );

            createRentalAndRoomWithStatus(
                    haiLandlord, "Tòa nhà Phòng trọ Hoàng Hoa Thám Tân Bình", "118/12 Hoàng Hoa Thám, Phường 13", "Quận Tân Bình", "Hồ Chí Minh",
                    "Phòng Khép Kín Cửa Sổ Lớn Ban Công — Gần Nhà Ga T3 Tân Sơn Nhất",
                    "Phòng trọ mới xây sạch đẹp 100%, có cửa sổ lớn đón ánh sáng tự nhiên. Trang bị sẵn máy lạnh, nệm êm ái, tủ đồ lớn. Bãi giữ xe rộng rãi dưới tầng trệt, không chung chủ, giờ giấc tự do.",
                    RoomType.PRIVATE, new BigDecimal("3500000"), new BigDecimal("24.0"), 2,
                    createCosts("3500000", "3800", "20000", "80000", "100000", "80000", "Khóa cổng vân tay, không tụ tập làm ồn."),
                    List.of("https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200", "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Ban công"), amenityMap.get("Khóa vân tay"), amenityMap.get("Bãi giữ xe")),
                    RoomStatus.AVAILABLE
            );

            createRentalAndRoomWithStatus(
                    tramLandlord, "Tòa Nhà Căn Hộ Mini Emart 2 Phan Văn Trị", "142/6 Phan Văn Trị, Phường 10", "Quận Gò Vấp", "Hồ Chí Minh",
                    "Duplex Gác Đúc Siêu Thoáng Liền Kề Emart 2 — Full Nội Thất Mới 100%",
                    "Căn hộ duplex gác lửng đúc trần cao thoáng đãng, ngay liền kề đại siêu thị Emart 2 Phan Văn Trị. Full đồ nội thất: máy lạnh, tủ lạnh, máy giặt, kệ bếp, giường nệm. Bãi giữ xe rộng, khóa vân tay thẻ từ ra vào tự do.",
                    RoomType.STUDIO, new BigDecimal("4200000"), new BigDecimal("28.0"), 2,
                    createCosts("4200000", "3800", "20000", "80000", "120000", "100000", "Khu dân cư an ninh, không nuôi thú cưng lớn."),
                    List.of("https://images.unsplash.com/photo-1502005229762-ee152da915ba?w=1200", "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Gác lửng"), amenityMap.get("Máy giặt riêng"), amenityMap.get("Khóa vân tay")),
                    RoomStatus.AVAILABLE
            );

            createRentalAndRoomWithStatus(
                    tramLandlord, "Nhà Trọ Xanh Quang Trung Gò Vấp", "684 Quang Trung, Phường 11", "Quận Gò Vấp", "Hồ Chí Minh",
                    "Phòng Trọ Ban Công Riêng Ngay Chợ Hạnh Thông Tây — Tiện Nghi Giá Tốt",
                    "Phòng trọ có ban công riêng đón gió mát mẻ, phòng tắm khép kín sạch sẽ. Cách chợ đêm Hạnh Thông Tây chỉ 300m, xung quanh nhiều hàng quán, bến xe buýt. Có bảo vệ coi xe, wifi cáp quang tốc độ cao.",
                    RoomType.PRIVATE, new BigDecimal("3200000"), new BigDecimal("24.0"), 2,
                    createCosts("3200000", "3600", "18000", "70000", "100000", "80000", "Giữ gìn trật tự chung, giờ giấc tự do."),
                    List.of("https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200", "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Ban công"), amenityMap.get("Khóa vân tay"), amenityMap.get("Wifi tốc độ cao")),
                    RoomStatus.AVAILABLE
            );

            createRentalAndRoomWithStatus(
                    phuongLandlord, "Chung cư Mini HexHome Làng Đại Học", "25 Khu Phố 6, Phường Linh Trung", "TP. Thủ Đức", "Hồ Chí Minh",
                    "Căn hộ 1PN Ban Công Riêng Biệt — Liền Kề ĐH Quốc Gia TP.HCM",
                    "Căn hộ mini 1 phòng ngủ riêng biệt thiết kế hiện đại, ban công rộng rãi thoáng gió. Rất phù hợp cho sinh viên các trường ĐH Bách Khoa, KHTN, KHXH&NV, CNTT hoặc giảng viên trẻ. Có thang máy, bảo vệ 24/7.",
                    RoomType.APARTMENT, new BigDecimal("4200000"), new BigDecimal("36.0"), 3,
                    createCosts("4200000", "3500", "18000", "80000", "100000", "100000", "Ưu tiên sinh viên, giữ gìn môi trường sống văn minh."),
                    List.of("https://images.unsplash.com/photo-1502005229762-ee152da915ba?w=1200", "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Ban công"), amenityMap.get("Thang máy"), amenityMap.get("Bếp riêng")),
                    RoomStatus.AVAILABLE
            );

            createRentalAndRoomWithStatus(
                    phuongLandlord, "Nhà Trọ Sinh Viên Tri Thức Võ Văn Ngân", "214 Võ Văn Ngân, Phường Bình Thọ", "TP. Thủ Đức", "Hồ Chí Minh",
                    "Gác Lửng Rộng Rãi Giá Tốt — Cách ĐH Sư Phạm Kỹ Thuật 200m",
                    "Phòng trọ sinh viên giá hợp lý ngay mặt tiền trung tâm Thủ Đức. Gác lửng đúc chắc chắn, có wifi tốc độ cao cho học tập, camera an ninh từng tầng, giờ giấc tự do không quản lý giờ.",
                    RoomType.PRIVATE, new BigDecimal("2800000"), new BigDecimal("22.0"), 2,
                    createCosts("2800000", "3500", "18000", "50000", "80000", "50000", "Khóa vân tay, để xe gọn gàng."),
                    List.of("https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200", "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200"),
                    Set.of(amenityMap.get("Gác lửng"), amenityMap.get("Wifi tốc độ cao"), amenityMap.get("Khóa vân tay"), amenityMap.get("Bãi giữ xe")),
                    RoomStatus.AVAILABLE
            );

            createRentalAndRoomWithStatus(
                    namLandlord, "HexVilla Studio Thảo Điền", "45 Quốc Hương, Phường Thảo Điền", "TP. Thủ Đức", "Hồ Chí Minh",
                    "Studio Cao Cấp Phong Cách Bắc Âu Liền Kề Ga Metro Thảo Điền",
                    "Căn hộ studio cao cấp phong cách Scandinavian tọa lạc tại khu nhà giàu Thảo Điền. Đi bộ ra ga Metro số 1 chỉ 3 phút. Tiện nghi cao cấp: sofa da, bếp từ Bosch, máy giặt sấy, máy lạnh Daikin, bồn tắm nằm thư giãn.",
                    RoomType.STUDIO, new BigDecimal("7800000"), new BigDecimal("45.0"), 2,
                    createCosts("7800000", "4200", "25000", "120000", "180000", "250000", "Cư dân trí thức, người nước ngoài, yên tĩnh văn minh."),
                    List.of("https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200", "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Máy giặt riêng"), amenityMap.get("Ban công"), amenityMap.get("Thang máy"), amenityMap.get("Khóa vân tay"), amenityMap.get("Bảo vệ 24/7")),
                    RoomStatus.AVAILABLE
            );

            createRentalAndRoomWithStatus(
                    tramLandlord, "Căn Hộ Dịch Vụ Phan Xích Long", "78 Phan Xích Long, Phường 2", "Quận Phú Nhuận", "Hồ Chí Minh",
                    "Căn Hộ Dịch Vụ Ban Công View Phố Ẩm Thực Phan Xích Long",
                    "Căn hộ dịch vụ trung tâm phố ẩm thực Phan Xích Long sầm uất. Thuận tiện đi Quận 1, Quận 3, sân bay chỉ 7 phút. Đầy đủ tiện nghi hiện đại, dọn phòng 1 lần/tuần miễn phí, bảo vệ 24/24.",
                    RoomType.STUDIO, new BigDecimal("6000000"), new BigDecimal("32.0"), 2,
                    createCosts("6000000", "3900", "22000", "100000", "120000", "150000", "Giờ tự do, không làm ồn ban đêm."),
                    List.of("https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=1200", "https://images.unsplash.com/photo-1502005229762-ee152da915ba?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Máy giặt riêng"), amenityMap.get("Ban công"), amenityMap.get("Thang máy"), amenityMap.get("Khóa vân tay")),
                    RoomStatus.AVAILABLE
            );

            createRentalAndRoomWithStatus(
                    lanLandlord, "Nhà Trọ Tri Thức An Dương Vương", "105/8 An Dương Vương, Phường 8", "Quận 5", "Hồ Chí Minh",
                    "Phòng Trọ Khép Kín Sát ĐH Sư Phạm & Sài Gòn — An Ninh Tuyệt Đối",
                    "Phòng trọ khép kín sạch sẽ ngay trung tâm Quận 5, cách ĐH Sư Phạm và ĐH Sài Gòn chỉ 300m. Có máy lạnh Inverter tiết kiệm điện, kệ bếp nấu ăn, bãi giữ xe có camera giám sát.",
                    RoomType.PRIVATE, new BigDecimal("3800000"), new BigDecimal("25.0"), 2,
                    createCosts("3800000", "3700", "18000", "80000", "120000", "100000", "Ưu tiên sinh viên và nhân viên văn phòng."),
                    List.of("https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200", "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200"),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Bếp riêng"), amenityMap.get("Khóa vân tay"), amenityMap.get("Bãi giữ xe")),
                    RoomStatus.AVAILABLE
            );

            log.info("HexRoom seed completed successfully! All accounts, published rentals, and roommates are ready.");
        } catch (Exception e) {
            log.error("Lỗi trong quá trình khởi tạo DataSeeder: {}", e.getMessage(), e);
        }
    }

    private void seedOrUpdateAdmin(String email, String fullName, String password) {
        try {
            User admin = userRepository.findByEmail(email).orElse(null);
            if (admin == null) {
                admin = User.builder()
                        .email(email)
                        .fullName(fullName)
                        .passwordHash(passwordEncoder.encode(password))
                        .phone("0988776655")
                        .avatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400")
                        .role(UserRole.ADMIN)
                        .status(UserStatus.ACTIVE)
                        .gender("Nam")
                        .isVip(true)
                        .emailVerified(true)
                        .phoneVerified(true)
                        .isIdentityVerified(true)
                        .build();
            } else {
                admin.setRole(UserRole.ADMIN);
                admin.setStatus(UserStatus.ACTIVE);
                admin.setPasswordHash(passwordEncoder.encode(password));
                admin.setIsVip(true);
            }
            userRepository.save(admin);
        } catch (Exception ex) {
            log.warn("Lưu ý seed admin {}: {}", email, ex.getMessage());
        }
    }

    private User seedOrUpdateLandlord(
            String email,
            String fullName,
            String phone,
            String gender,
            String cccdNumber,
            String issueDate,
            String issuePlace,
            String address,
            String dob,
            String avatarUrl
    ) {
        try {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                user = User.builder()
                        .email(email)
                        .fullName(fullName)
                        .passwordHash(passwordEncoder.encode("123456"))
                        .phone(phone)
                        .avatarUrl(avatarUrl)
                        .role(UserRole.LANDLORD)
                        .status(UserStatus.ACTIVE)
                        .gender(gender)
                        .isVip(true)
                        .isIdentityVerified(true)
                        .identityCardNumber(cccdNumber)
                        .identityCardIssuedDate(issueDate)
                        .identityCardIssuedPlace(issuePlace)
                        .permanentAddress(address)
                        .phoneVerified(true)
                        .emailVerified(true)
                        .dateOfBirth(dob)
                        .identityVerifiedAt(LocalDateTime.now().minusMonths(4))
                        .identityCardFrontUrl("https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80")
                        .identityCardBackUrl("https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=800&q=80")
                        .build();
            } else {
                user.setRole(UserRole.LANDLORD);
                user.setFullName(fullName);
                user.setPhone(phone);
                user.setGender(gender);
                user.setIsVip(true);
                user.setIsIdentityVerified(true);
                user.setIdentityCardNumber(cccdNumber);
                user.setIdentityCardIssuedDate(issueDate);
                user.setIdentityCardIssuedPlace(issuePlace);
                user.setPermanentAddress(address);
                user.setPhoneVerified(true);
                user.setEmailVerified(true);
                user.setDateOfBirth(dob);
                user.setIdentityVerifiedAt(LocalDateTime.now().minusMonths(4));
                if (user.getIdentityCardFrontUrl() == null) {
                    user.setIdentityCardFrontUrl("https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80");
                }
                if (user.getIdentityCardBackUrl() == null) {
                    user.setIdentityCardBackUrl("https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=800&q=80");
                }
                if (user.getAvatarUrl() == null) {
                    user.setAvatarUrl(avatarUrl);
                }
            }
            return userRepository.save(user);
        } catch (Exception ex) {
            log.warn("Lưu ý landlord {}: {}", email, ex.getMessage());
            return null;
        }
    }

    private void seedOrUpdateTenant(
            String email,
            String fullName,
            String phone,
            String gender,
            String dob,
            String cccdNumber,
            String issueDate,
            String address,
            String avatarUrl,
            String nickname,
            BigDecimal budgetMin,
            BigDecimal budgetMax,
            boolean smoking,
            boolean hasPets,
            String wakeTime,
            String bedtime,
            String occupation,
            List<String> interests
    ) {
        try {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                user = User.builder()
                        .email(email)
                        .fullName(fullName)
                        .passwordHash(passwordEncoder.encode("123456"))
                        .phone(phone)
                        .avatarUrl(avatarUrl)
                        .role(UserRole.TENANT)
                        .status(UserStatus.ACTIVE)
                        .gender(gender)
                        .isVip(true)
                        .isIdentityVerified(true)
                        .identityCardNumber(cccdNumber)
                        .identityCardIssuedDate(issueDate)
                        .identityCardIssuedPlace("Cục Cảnh sát QLHC về TTXH")
                        .permanentAddress(address)
                        .phoneVerified(true)
                        .emailVerified(true)
                        .dateOfBirth(dob)
                        .identityVerifiedAt(LocalDateTime.now().minusMonths(3))
                        .build();
            } else {
                user.setRole(UserRole.TENANT);
                user.setFullName(fullName);
                user.setPhone(phone);
                user.setGender(gender);
                user.setIsVip(true);
                user.setIsIdentityVerified(true);
                user.setIdentityCardNumber(cccdNumber);
                user.setIdentityCardIssuedDate(issueDate);
                user.setIdentityCardIssuedPlace("Cục Cảnh sát QLHC về TTXH");
                user.setPermanentAddress(address);
                user.setPhoneVerified(true);
                user.setEmailVerified(true);
                user.setDateOfBirth(dob);
                if (user.getAvatarUrl() == null) {
                    user.setAvatarUrl(avatarUrl);
                }
            }
            user = userRepository.save(user);

            // Seed / Update RoommateProfile
            try {
                RoommateProfile rp = roommateProfileRepository.findByUserId(user.getId()).orElse(new RoommateProfile());
                rp.setUser(user);
                rp.setNickname(nickname);
                rp.setCity("Hồ Chí Minh");
                rp.setBudgetMin(budgetMin);
                rp.setBudgetMax(budgetMax);
                rp.setMoveInDate(LocalDate.now().plusWeeks(1));
                rp.setSmoking(smoking);
                rp.setHasPets(hasPets);
                rp.setAcceptSmoking(false);
                rp.setAcceptPets(true);
                rp.setVisible(true);
                rp.setSleepSchedule(wakeTime + " - " + bedtime);
                roommateProfileRepository.save(rp);
            } catch (Exception ex) {
                log.warn("Lưu ý RoommateProfile cho {}: {}", email, ex.getMessage());
            }

            // Seed / Update LifestyleProfile
            try {
                LifestyleProfile lp = lifestyleProfileRepository.findByUserId(user.getId()).orElse(new LifestyleProfile());
                lp.setUser(user);
                lp.setSmoking(smoking);
                lp.setDrinking(false);
                lp.setPetsAllowed(hasPets);
                lp.setSleepSchedule(wakeTime + " - " + bedtime);
                lp.setBedtime(bedtime);
                lp.setPersonalityType("Hòa đồng, lịch sự, văn minh");
                lp.setCleanliness("Rất sạch sẽ");
                lp.setCookingFrequency("Thường xuyên");
                lp.setGuestFrequency("Thỉnh thoảng");
                lp.setNoiseTolerance("Vừa phải");
                lp.setSocialLevel("Thân thiện");
                lp.setOccupationType(occupation);
                lp.setQuietHoursPreference("22:30 - 06:30");
                lp.setInterests(new ArrayList<>(interests != null ? interests : List.of("Đọc sách", "Thể thao", "Công nghệ")));
                lp.setLanguages(new ArrayList<>(List.of("Tiếng Việt", "Tiếng Anh")));
                lifestyleProfileRepository.save(lp);
            } catch (Exception ex) {
                log.warn("Lưu ý LifestyleProfile cho {}: {}", email, ex.getMessage());
            }

            // Seed / Update UserPreference
            try {
                UserPreference up = userPreferenceRepository.findByUserId(user.getId()).orElse(new UserPreference());
                up.setUser(user);
                up.setBudgetMin(budgetMin);
                up.setBudgetMax(budgetMax);
                up.setPreferredLocation("Bình Thạnh, Quận 10, Thủ Đức, Quận 7");
                up.setPreferredGender(gender);
                up.setPreferredDistricts(new ArrayList<>(List.of("Bình Thạnh", "Quận 10", "Thủ Đức", "Quận 7", "Quận 3")));
                up.setMustHaveAmenities(new ArrayList<>(List.of("Máy lạnh", "Wifi tốc độ cao", "Khóa vân tay")));
                up.setPreferredAmenities(new ArrayList<>(List.of("Máy giặt riêng", "Ban công", "Bếp riêng")));
                up.setPreferredLeaseMonths(6);
                up.setMoveInDateMin(LocalDate.now());
                up.setMoveInDateMax(LocalDate.now().plusMonths(1));
                userPreferenceRepository.save(up);
            } catch (Exception ex) {
                log.warn("Lưu ý UserPreference cho {}: {}", email, ex.getMessage());
            }
        } catch (Exception ex) {
            log.warn("Lỗi khi seed tenant {}: {}", email, ex.getMessage());
        }
    }

    private RoomCosts createCosts(String deposit, String elec, String water, String net, String park, String svc, String rules) {
        return RoomCosts.builder()
                .deposit(new BigDecimal(deposit))
                .electricityPerKwh(new BigDecimal(elec))
                .waterPerM3(new BigDecimal(water))
                .internetMonthly(new BigDecimal(net))
                .parkingMonthly(new BigDecimal(park))
                .serviceMonthly(new BigDecimal(svc))
                .paymentCycleMonths(1)
                .houseRules(rules)
                .feeNotes("Điện nước có công tơ riêng, minh bạch 100%.")
                .build();
    }

    private void createRentalAndRoomWithStatus(
            User owner,
            String rentalTitle,
            String address,
            String district,
            String city,
            String roomName,
            String description,
            RoomType roomType,
            BigDecimal price,
            BigDecimal sizeM2,
            int maxPeople,
            RoomCosts costs,
            List<String> imageUrls,
            Set<Amenity> amenities,
            RoomStatus roomStatus
    ) {
        try {
            if (owner == null) {
                return;
            }

            if (roomRepository.existsByRoomName(roomName)) {
                return;
            }

            Rental rental = rentalRepository.findByTitle(rentalTitle).stream().findFirst().orElse(null);
            if (rental == null) {
                Location location = locationRepository.save(Location.builder()
                        .address(address)
                        .district(district)
                        .city(city)
                        .build());

                rental = rentalRepository.save(Rental.builder()
                        .owner(owner)
                        .location(location)
                        .title(rentalTitle)
                        .description(description)
                        .status(RentalStatus.AVAILABLE)
                        .build());
            }

            Room room = Room.builder()
                    .rental(rental)
                    .roomName(roomName)
                    .description(description)
                    .roomType(roomType)
                    .price(price)
                    .sizeM2(sizeM2)
                    .maxPeople(maxPeople)
                    .status(roomStatus != null ? roomStatus : RoomStatus.AVAILABLE)
                    .costs(costs)
                    .availabilityConfirmedAt(LocalDateTime.now())
                    .amenities(amenities != null ? new HashSet<>(amenities) : new HashSet<>())
                    .images(new ArrayList<>())
                    .build();

            Room savedRoom = roomRepository.save(room);

            if (imageUrls != null && !imageUrls.isEmpty()) {
                for (String imgUrl : imageUrls) {
                    savedRoom.getImages().add(RoomImage.builder()
                            .room(savedRoom)
                            .imageUrl(imgUrl)
                            .build());
                }
                roomRepository.save(savedRoom);
            }
        } catch (Exception ex) {
            log.warn("Lỗi khi seed phòng '{}': {}", roomName, ex.getMessage());
        }
    }
}
