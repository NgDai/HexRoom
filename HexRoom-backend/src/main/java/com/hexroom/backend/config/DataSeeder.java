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
import org.springframework.transaction.annotation.Transactional;

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
    @Transactional
    public void run(String... args) {
        log.info("Starting HexRoom Data Seeder for accounts, landlords, and listings...");

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
            Amenity amenity = amenityRepository.findByNameIgnoreCase(name)
                    .orElseGet(() -> amenityRepository.save(Amenity.builder().name(name).build()));
            amenityMap.put(name, amenity);
        }

        // 2. Seed Base System Users
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

        userRepository.findByEmail("admin@hexroom.vn")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("admin@hexroom.vn")
                        .fullName("Trịnh Hoàng Minh (Quản trị Admin)")
                        .passwordHash(passwordEncoder.encode("123456"))
                        .phone("0988776655")
                        .avatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400")
                        .role(UserRole.ADMIN)
                        .status(UserStatus.ACTIVE)
                        .gender("Nam")
                        .isVip(true)
                        .build()));

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

        // 3. SEED 4 CHÍNH TÀI KHOẢN CỦA NGƯỜI DÙNG YÊU CẦU
        // Account 1: Chủ nhà gioedm6@gmail.com
        User gioLandlord = seedOrUpdateLandlord(
                "gioedm6@gmail.com",
                "Hoàng Thanh Huy",
                "0983749273",
                "Nam",
                "079098374927",
                "2021-06-12",
                "Cục Cảnh sát QLHC về TTXH",
                "188 Nguyễn Xí, Phường 26, Quận Bình Thạnh, TP. Hồ Chí Minh",
                "1992-10-15",
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
        );

        // Account 2: Người thuê nguyendai2412005@gmail.com
        seedOrUpdateTenant(
                "nguyendai2412005@gmail.com",
                "Nguyễn Quốc Đại",
                "0909241205",
                "Nam",
                "2005-12-24",
                "079205012412",
                "2023-01-10",
                "45/12 Kha Vạn Cân, Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh",
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400",
                "Đại Quốc",
                new BigDecimal("2000000"),
                new BigDecimal("4500000"),
                false,
                false,
                "07:00",
                "23:00"
        );

        // Account 3: Người thuê manhlk631@gmail.com
        seedOrUpdateTenant(
                "manhlk631@gmail.com",
                "Lê Kim Mạnh",
                "0918631631",
                "Nam",
                "2003-05-18",
                "079203006631",
                "2022-03-20",
                "128 Cách Mạng Tháng 8, Phường 10, Quận 3, TP. Hồ Chí Minh",
                "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400",
                "Mạnh Lê",
                new BigDecimal("2500000"),
                new BigDecimal("5000000"),
                false,
                true,
                "06:30",
                "23:30"
        );

        // Account 4: Người thuê thikhuyen098@gmail.com
        seedOrUpdateTenant(
                "thikhuyen098@gmail.com",
                "Nguyễn Thị Khuyên",
                "0977098098",
                "Nữ",
                "2004-09-08",
                "079304008098",
                "2022-08-15",
                "89 Phan Văn Trị, Phường 11, Quận Bình Thạnh, TP. Hồ Chí Minh",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
                "Khuyên Nguyễn",
                new BigDecimal("1800000"),
                new BigDecimal("4000000"),
                false,
                false,
                "06:00",
                "22:30"
        );

        // 4. SEED THÊM VÀI CHỦ NHÀ ĐĂNG BÀI LÊN
        // Landlord thêm 1: Cô Lan (Quận 10 & Bình Thạnh)
        User lanLandlord = seedOrUpdateLandlord(
                "lan.tran@hexroom.vn",
                "Trần Thị Ngọc Lan (Cô Lan Chủ trọ)",
                "0903112233",
                "Nữ",
                "079178001122",
                "2020-04-10",
                "Cục Cảnh sát QLHC về TTXH",
                "452/8 Sư Vạn Hạnh, Phường 12, Quận 10, TP. Hồ Chí Minh",
                "1978-04-12",
                "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400"
        );

        // Landlord thêm 2: Anh Hải (Tân Bình)
        User haiLandlord = seedOrUpdateLandlord(
                "hai.nguyen@hexroom.vn",
                "Nguyễn Văn Hải (Hải BĐS Tân Bình)",
                "0938445566",
                "Nam",
                "079185003344",
                "2021-08-19",
                "Cục Cảnh sát QLHC về TTXH",
                "36 Bạch Đằng, Phường 2, Quận Tân Bình, TP. Hồ Chí Minh",
                "1985-11-20",
                "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400"
        );

        // Landlord thêm 3: Chị Mai Phương (Thủ Đức - Làng Đại Học)
        User phuongLandlord = seedOrUpdateLandlord(
                "phuong.doan@hexroom.vn",
                "Đoàn Mai Phương (HexHome Thủ Đức)",
                "0919778899",
                "Nữ",
                "079190005566",
                "2022-02-14",
                "Cục Cảnh sát QLHC về TTXH",
                "25 Khu Phố 6, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh",
                "1990-09-14",
                "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400"
        );

        // 5. ĐĂNG BÀI CHO CHỦ NHÀ GIOEDM6 (HOÀNG THANH HUY)
        if (!rentalRepository.existsByOwnerId(gioLandlord.getId())) {
            createRentalAndRoom(
                    gioLandlord,
                    "Tòa nhà HexRoom Residence Nguyễn Xí Bình Thạnh",
                    "188/15 Nguyễn Xí, Phường 26", "Quận Bình Thạnh", "Hồ Chí Minh",
                    "Căn hộ Studio Ban Công Thoáng Sáng — Gần ĐH Ngoại Thương & HUTECH",
                    "Phòng Studio 35m² mới xây 100%, có ban công riêng view Landmark 81 cực đẹp. Đầy đủ tiện nghi: máy lạnh Inverter, tủ lạnh 2 cánh, máy giặt riêng, giường nệm cao cấp, bàn làm việc, tủ bếp gỗ sồi. Giờ giấc tự do, bảo vệ 24/7.",
                    RoomType.STUDIO,
                    new BigDecimal("5500000"),
                    new BigDecimal("35.0"),
                    2,
                    RoomCosts.builder()
                            .deposit(new BigDecimal("5500000"))
                            .electricityPerKwh(new BigDecimal("3800"))
                            .waterPerM3(new BigDecimal("20000"))
                            .internetMonthly(new BigDecimal("100000"))
                            .parkingMonthly(new BigDecimal("120000"))
                            .serviceMonthly(new BigDecimal("150000"))
                            .paymentCycleMonths(1)
                            .houseRules("Giữ gìn vệ sinh chung, không ồn ào sau 23h.")
                            .feeNotes("Điện nước có công tơ riêng từng phòng.")
                            .build(),
                    List.of(
                            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200",
                            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200",
                            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200"
                    ),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Máy giặt riêng"), amenityMap.get("Ban công"), amenityMap.get("Thang máy"), amenityMap.get("Khóa vân tay"))
            );

            createRentalAndRoom(
                    gioLandlord,
                    "Khu Căn Hộ Mini Hoàng Thanh Huy Đinh Bộ Lĩnh",
                    "92 Đinh Bộ Lĩnh, Phường 26", "Quận Bình Thạnh", "Hồ Chí Minh",
                    "Phòng Gác Lửng Đúc Full Nội Thất — Ngay Bến Xe Miền Đông",
                    "Phòng trọ gác lửng đúc kiên cố cao ráo không đụng đầu, ban công riêng đón gió mát. Có sẵn máy lạnh, tủ quần áo, kệ bếp, WC khép kín thiết bị cao cấp. Cổng khóa vân tay, camera giám sát 24/24.",
                    RoomType.PRIVATE,
                    new BigDecimal("3800000"),
                    new BigDecimal("26.0"),
                    2,
                    RoomCosts.builder()
                            .deposit(new BigDecimal("3800000"))
                            .electricityPerKwh(new BigDecimal("3600"))
                            .waterPerM3(new BigDecimal("18000"))
                            .internetMonthly(new BigDecimal("80000"))
                            .parkingMonthly(new BigDecimal("100000"))
                            .serviceMonthly(new BigDecimal("100000"))
                            .paymentCycleMonths(1)
                            .houseRules("Ra vào vân tay, an ninh tuyệt đối.")
                            .feeNotes("Miễn phí phí rác và vệ sinh hành lang.")
                            .build(),
                    List.of(
                            "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200",
                            "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200"
                    ),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Gác lửng"), amenityMap.get("Khóa vân tay"), amenityMap.get("Bãi giữ xe"))
            );
        }

        // 6. ĐĂNG BÀI CHO CÔ LAN (QUẬN 10 & BÌNH THẠNH)
        if (!rentalRepository.existsByOwnerId(lanLandlord.getId())) {
            createRentalAndRoom(
                    lanLandlord,
                    "Nhà trọ Cao cấp HexRoom Quận 10",
                    "452/8 Sư Vạn Hạnh, Phường 12", "Quận 10", "Hồ Chí Minh",
                    "Phòng Duplex Gác Lửng Trần Cao P.105 — Sát ĐH Huflit & Vạn Hạnh Mall",
                    "Phòng duplex gác đúc trần cao 4m thoáng đãng, thiết kế hiện đại sang trọng. Đầy đủ tiện nghi: máy lạnh Daikin, tủ lạnh, bếp riêng, máy nước nóng. Khu vực sầm uất trung tâm Quận 10, an ninh tuyệt đối.",
                    RoomType.PRIVATE,
                    new BigDecimal("4800000"),
                    new BigDecimal("28.0"),
                    2,
                    RoomCosts.builder()
                            .deposit(new BigDecimal("4800000"))
                            .electricityPerKwh(new BigDecimal("3900"))
                            .waterPerM3(new BigDecimal("20000"))
                            .internetMonthly(new BigDecimal("100000"))
                            .parkingMonthly(new BigDecimal("150000"))
                            .serviceMonthly(new BigDecimal("120000"))
                            .paymentCycleMonths(1)
                            .houseRules("Giữ trật tự chung, xe để đúng vị trí.")
                            .feeNotes("Tiền phòng thu từ ngày 01 đến 05 hàng tháng.")
                            .build(),
                    List.of(
                            "https://images.unsplash.com/photo-1502005229762-ee152da915ba?w=1200",
                            "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=1200"
                    ),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Gác lửng"), amenityMap.get("Bếp riêng"), amenityMap.get("Khóa vân tay"))
            );

            createRentalAndRoom(
                    lanLandlord,
                    "Căn hộ Dịch vụ HexHome Bình Thạnh",
                    "124/18 Xô Viết Nghệ Tĩnh, Phường 21", "Quận Bình Thạnh", "Hồ Chí Minh",
                    "Studio Ban Công Thoáng Mát P.302 — Giáp Quận 1 chỉ 3 Phút",
                    "Căn hộ dịch vụ cao cấp ngay cửa ngõ Quận 1. Ban công view sông thoáng đãng, nội thất gỗ sồi cao cấp, thang máy thẻ từ, máy giặt riêng từng phòng. Miễn phí dọn dẹp vệ sinh phòng 2 lần/tuần.",
                    RoomType.STUDIO,
                    new BigDecimal("5200000"),
                    new BigDecimal("30.0"),
                    2,
                    RoomCosts.builder()
                            .deposit(new BigDecimal("5200000"))
                            .electricityPerKwh(new BigDecimal("3800"))
                            .waterPerM3(new BigDecimal("22000"))
                            .internetMonthly(new BigDecimal("100000"))
                            .parkingMonthly(new BigDecimal("120000"))
                            .serviceMonthly(new BigDecimal("150000"))
                            .paymentCycleMonths(1)
                            .houseRules("Không nuôi thú cưng lớn. Hút thuốc ngoài ban công.")
                            .feeNotes("Miễn phí dọn phòng định kỳ.")
                            .build(),
                    List.of(
                            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200",
                            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200"
                    ),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Ban công"), amenityMap.get("Thang máy"), amenityMap.get("Máy giặt riêng"))
            );
        }

        // 7. ĐĂNG BÀI CHO ANH HẢI (TÂN BÌNH)
        if (!rentalRepository.existsByOwnerId(haiLandlord.getId())) {
            createRentalAndRoom(
                    haiLandlord,
                    "HexApartment Sân Bay Tân Sơn Nhất",
                    "36 Bạch Đằng, Phường 2", "Quận Tân Bình", "Hồ Chí Minh",
                    "Studio Sang Trọng Liền Kề Sân Bay — Full Đồ Điện Máy Cao Cấp",
                    "Căn hộ Studio vị trí đắc địa cách sân bay Tân Sơn Nhất chỉ 500m. Thích hợp cho tiếp viên hàng không, phi công, chuyên gia hoặc nhân viên văn phòng. Tiện ích đẳng cấp: giường King size, tivi thông minh, máy giặt sấy, khóa cửa thông minh.",
                    RoomType.STUDIO,
                    new BigDecimal("6200000"),
                    new BigDecimal("35.0"),
                    2,
                    RoomCosts.builder()
                            .deposit(new BigDecimal("6200000"))
                            .electricityPerKwh(new BigDecimal("4000"))
                            .waterPerM3(new BigDecimal("25000"))
                            .internetMonthly(new BigDecimal("120000"))
                            .parkingMonthly(new BigDecimal("150000"))
                            .serviceMonthly(new BigDecimal("200000"))
                            .paymentCycleMonths(1)
                            .houseRules("Hợp đồng từ 6 tháng. Giờ giấc tự do 24/7.")
                            .feeNotes("Có dịch vụ giặt ủi và dọn phòng theo yêu cầu.")
                            .build(),
                    List.of(
                            "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200",
                            "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200"
                    ),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Thang máy"), amenityMap.get("Khóa vân tay"), amenityMap.get("Bảo vệ 24/7"))
            );

            createRentalAndRoom(
                    haiLandlord,
                    "Tòa nhà Phòng trọ Hoàng Hoa Thám Tân Bình",
                    "118/12 Hoàng Hoa Thám, Phường 13", "Quận Tân Bình", "Hồ Chí Minh",
                    "Phòng Khép Kín Cửa Sổ Lớn Ban Công — Gần Nhà Ga T3 Tân Sơn Nhất",
                    "Phòng trọ mới xây sạch đẹp 100%, có cửa sổ lớn đón ánh sáng tự nhiên. Trang bị sẵn máy lạnh, nệm êm ái, tủ đồ lớn. Bãi giữ xe rộng rãi dưới tầng trệt, không chung chủ, giờ giấc tự do.",
                    RoomType.PRIVATE,
                    new BigDecimal("3500000"),
                    new BigDecimal("24.0"),
                    2,
                    RoomCosts.builder()
                            .deposit(new BigDecimal("3500000"))
                            .electricityPerKwh(new BigDecimal("3800"))
                            .waterPerM3(new BigDecimal("20000"))
                            .internetMonthly(new BigDecimal("80000"))
                            .parkingMonthly(new BigDecimal("100000"))
                            .serviceMonthly(new BigDecimal("80000"))
                            .paymentCycleMonths(1)
                            .houseRules("Khóa cổng vân tay, không tụ tập làm ồn.")
                            .feeNotes("Miễn phí tiền rác.")
                            .build(),
                    List.of(
                            "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200",
                            "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200"
                    ),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Ban công"), amenityMap.get("Khóa vân tay"), amenityMap.get("Bãi giữ xe"))
            );
        }

        // 8. ĐĂNG BÀI CHO CHỊ MAI PHƯƠNG (THỦ ĐỨC)
        if (!rentalRepository.existsByOwnerId(phuongLandlord.getId())) {
            createRentalAndRoom(
                    phuongLandlord,
                    "Chung cư Mini HexHome Làng Đại Học",
                    "25 Khu Phố 6, Phường Linh Trung", "TP. Thủ Đức", "Hồ Chí Minh",
                    "Căn hộ 1PN Ban Công Riêng Biệt — Liền Kề ĐH Quốc Gia TP.HCM",
                    "Căn hộ mini 1 phòng ngủ riêng biệt thiết kế hiện đại, ban công rộng rãi thoáng gió. Rất phù hợp cho sinh viên các trường ĐH Bách Khoa, KHTN, KHXH&NV, CNTT hoặc giảng viên trẻ. Có thang máy, bảo vệ 24/7.",
                    RoomType.APARTMENT,
                    new BigDecimal("4200000"),
                    new BigDecimal("36.0"),
                    3,
                    RoomCosts.builder()
                            .deposit(new BigDecimal("4200000"))
                            .electricityPerKwh(new BigDecimal("3500"))
                            .waterPerM3(new BigDecimal("18000"))
                            .internetMonthly(new BigDecimal("80000"))
                            .parkingMonthly(new BigDecimal("100000"))
                            .serviceMonthly(new BigDecimal("100000"))
                            .paymentCycleMonths(1)
                            .houseRules("Ưu tiên sinh viên, giữ gìn môi trường sống văn minh.")
                            .feeNotes("Miễn phí phí quản lý tòa nhà.")
                            .build(),
                    List.of(
                            "https://images.unsplash.com/photo-1502005229762-ee152da915ba?w=1200",
                            "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200"
                    ),
                    Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Ban công"), amenityMap.get("Thang máy"), amenityMap.get("Bếp riêng"))
            );

            createRentalAndRoom(
                    phuongLandlord,
                    "Nhà Trọ Sinh Viên Tri Thức Võ Văn Ngân",
                    "214 Võ Văn Ngân, Phường Bình Thọ", "TP. Thủ Đức", "Hồ Chí Minh",
                    "Gác Lửng Rộng Rãi Giá Tốt — Cách ĐH Sư Phạm Kỹ Thuật 200m",
                    "Phòng trọ sinh viên giá hợp lý ngay mặt tiền trung tâm Thủ Đức. Gác lửng đúc chắc chắn, có wifi tốc độ cao cho học tập, camera an ninh từng tầng, giờ giấc tự do không quản lý giờ.",
                    RoomType.PRIVATE,
                    new BigDecimal("2800000"),
                    new BigDecimal("22.0"),
                    2,
                    RoomCosts.builder()
                            .deposit(new BigDecimal("2800000"))
                            .electricityPerKwh(new BigDecimal("3500"))
                            .waterPerM3(new BigDecimal("18000"))
                            .internetMonthly(new BigDecimal("50000"))
                            .parkingMonthly(new BigDecimal("80000"))
                            .serviceMonthly(new BigDecimal("50000"))
                            .paymentCycleMonths(1)
                            .houseRules("Khóa vân tay, để xe gọn gàng.")
                            .feeNotes("Điện nước tính theo công tơ nhà nước.")
                            .build(),
                    List.of(
                            "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200",
                            "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200"
                    ),
                    Set.of(amenityMap.get("Gác lửng"), amenityMap.get("Wifi tốc độ cao"), amenityMap.get("Khóa vân tay"), amenityMap.get("Bãi giữ xe"))
            );
        }

        // 9. Seed default rooms if room count is low
        if (roomRepository.count() <= 8) {
            seedDefaultRooms(defaultLandlord, amenityMap);
        }

        log.info("HexRoom seed completed successfully! All accounts and published rentals are ready.");
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
            String bedtime
    ) {
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

        // Seed RoommateProfile
        if (roommateProfileRepository.findByUserId(user.getId()).isEmpty()) {
            RoommateProfile rp = new RoommateProfile();
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
        }

        // Seed LifestyleProfile
        if (lifestyleProfileRepository.findByUserId(user.getId()).isEmpty()) {
            LifestyleProfile lp = LifestyleProfile.builder()
                    .user(user)
                    .smoking(smoking)
                    .drinking(false)
                    .petsAllowed(hasPets)
                    .sleepSchedule(wakeTime + " - " + bedtime)
                    .bedtime(bedtime)
                    .personalityType("Hòa đồng, lịch sự, văn minh")
                    .cleanliness("Rất sạch sẽ")
                    .cookingFrequency("Thường xuyên")
                    .guestFrequency("Thỉnh thoảng")
                    .noiseTolerance("Vừa phải")
                    .socialLevel("Thân thiện")
                    .occupationType("Sinh viên / Nhân viên văn phòng")
                    .quietHoursPreference("22:30 - 06:30")
                    .interests(List.of("Đọc sách", "Thể thao", "Công nghệ", "Nấu ăn"))
                    .languages(List.of("Tiếng Việt", "Tiếng Anh"))
                    .build();
            lifestyleProfileRepository.save(lp);
        }

        // Seed UserPreference
        if (userPreferenceRepository.findByUserId(user.getId()).isEmpty()) {
            UserPreference up = UserPreference.builder()
                    .user(user)
                    .budgetMin(budgetMin)
                    .budgetMax(budgetMax)
                    .preferredLocation("Bình Thạnh, Quận 10, Thủ Đức")
                    .preferredGender(gender)
                    .preferredDistricts(List.of("Bình Thạnh", "Quận 10", "Thủ Đức"))
                    .mustHaveAmenities(List.of("Máy lạnh", "Wifi tốc độ cao", "Khóa vân tay"))
                    .preferredAmenities(List.of("Máy giặt riêng", "Ban công", "Bếp riêng"))
                    .preferredLeaseMonths(6)
                    .moveInDateMin(LocalDate.now())
                    .moveInDateMax(LocalDate.now().plusMonths(1))
                    .build();
            userPreferenceRepository.save(up);
        }
    }

    private void seedDefaultRooms(User landlord, Map<String, Amenity> amenityMap) {
        // Room 1: Studio Bình Thạnh
        createRentalAndRoom(
                landlord,
                "Tòa nhà căn hộ dịch vụ HexHouse Bình Thạnh",
                "152/24 Nguyễn Gia Trí (D2 cũ)", "Quận Bình Thạnh", "Hồ Chí Minh",
                "Studio Ban Công Thoáng Mát — Full Nội Thất Cao Cấp",
                "Phòng Studio rộng 35m² mới 100%, có ban công riêng view Landmark 81 cực đẹp. Đầy đủ tiện nghi: máy lạnh Inverter, tủ lạnh 2 cánh, máy giặt riêng, giường nệm cao cấp, bàn làm việc, tủ bếp gỗ sồi.",
                RoomType.STUDIO,
                new BigDecimal("5200000"),
                new BigDecimal("35.0"),
                2,
                RoomCosts.builder()
                        .deposit(new BigDecimal("5200000"))
                        .electricityPerKwh(new BigDecimal("3800"))
                        .waterPerM3(new BigDecimal("20000"))
                        .internetMonthly(new BigDecimal("100000"))
                        .parkingMonthly(new BigDecimal("120000"))
                        .serviceMonthly(new BigDecimal("150000"))
                        .paymentCycleMonths(1)
                        .houseRules("Giữ gìn vệ sinh chung, không làm ồn sau 23h.")
                        .feeNotes("Điện nước tính theo công tơ riêng từng phòng.")
                        .build(),
                List.of(
                        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200",
                        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200",
                        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200"
                ),
                Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Máy giặt riêng"), amenityMap.get("Ban công"), amenityMap.get("Thang máy"), amenityMap.get("Khóa vân tay"))
        );

        // Room 2: Gác lửng D5 Bình Thạnh
        createRentalAndRoom(
                landlord,
                "Khu Trọ An Ninh D5 Bình Thạnh",
                "48 Đường D5, Phường 25", "Quận Bình Thạnh", "Hồ Chí Minh",
                "Phòng Gác Lửng Đúc Hiện Đại — Gần ĐH Ngoại Thương & HUTECH",
                "Phòng gác lửng đúc cao không đụng đầu, lát gạch men sạch bóng. Có cửa sổ đón gió trời tự nhiên, WC khép kín thiết bị Inax xịn sò. Vị trí trung tâm Bình Thạnh.",
                RoomType.PRIVATE,
                new BigDecimal("3600000"),
                new BigDecimal("26.0"),
                2,
                RoomCosts.builder()
                        .deposit(new BigDecimal("3600000"))
                        .electricityPerKwh(new BigDecimal("3500"))
                        .waterPerM3(new BigDecimal("18000"))
                        .internetMonthly(new BigDecimal("80000"))
                        .parkingMonthly(new BigDecimal("100000"))
                        .serviceMonthly(new BigDecimal("100000"))
                        .paymentCycleMonths(1)
                        .houseRules("Cổng ra vào khóa thẻ từ an ninh, giữ trật tự sau 22h30.")
                        .feeNotes("Miễn phí rác sinh hoạt.")
                        .build(),
                List.of(
                        "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200",
                        "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200"
                ),
                Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Gác lửng"), amenityMap.get("Khóa vân tay"), amenityMap.get("Bãi giữ xe"))
        );
    }

    private void createRentalAndRoom(
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
            Set<Amenity> amenities
    ) {
        Location location = locationRepository.save(Location.builder()
                .address(address)
                .district(district)
                .city(city)
                .build());

        Rental rental = rentalRepository.save(Rental.builder()
                .owner(owner)
                .location(location)
                .title(rentalTitle)
                .description(description)
                .status(RentalStatus.AVAILABLE)
                .build());

        Room room = roomRepository.save(Room.builder()
                .rental(rental)
                .roomName(roomName)
                .description(description)
                .roomType(roomType)
                .price(price)
                .sizeM2(sizeM2)
                .maxPeople(maxPeople)
                .status(RoomStatus.AVAILABLE)
                .costs(costs)
                .availabilityConfirmedAt(LocalDateTime.now())
                .amenities(amenities != null ? new HashSet<>(amenities) : new HashSet<>())
                .build());

        if (imageUrls != null) {
            for (int i = 0; i < imageUrls.size(); i++) {
                room.getImages().add(RoomImage.builder()
                        .room(room)
                        .imageUrl(imageUrls.get(i))
                        .build());
            }
            roomRepository.save(room);
        }
    }
}
