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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

    @Override
    @Transactional
    public void run(String... args) {
        if (roomRepository.count() > 0) {
            log.info("HexRoom database already contains rooms, skipping seeder.");
            return;
        }

        log.info("Starting HexRoom initial data seed for rooms and users...");

        // 1. Seed Users
        User landlord = userRepository.findByEmail("landlord@hexroom.vn")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("landlord@hexroom.vn")
                        .fullName("Nguyễn Văn Thắng (Chủ trọ HexRoom)")
                        .passwordHash(passwordEncoder.encode("123456"))
                        .phone("0908123456")
                        .avatarUrl("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400")
                        .role(UserRole.LANDLORD)
                        .status(UserStatus.ACTIVE)
                        .gender("Nam")
                        .isVip(true)
                        .build()));

        userRepository.findByEmail("tenant@hexroom.vn")
                .orElseGet(() -> userRepository.save(User.builder()
                        .email("tenant@hexroom.vn")
                        .fullName("Trần Thị Mai Anh")
                        .passwordHash(passwordEncoder.encode("123456"))
                        .phone("0912345678")
                        .avatarUrl("https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400")
                        .role(UserRole.TENANT)
                        .status(UserStatus.ACTIVE)
                        .gender("Nữ")
                        .isVip(false)
                        .build()));

        // 2. Seed Amenities
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

        // 3. Seed Rentals and Rooms
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

        // Room 3: Căn hộ mini Quận 7
        createRentalAndRoom(
                landlord,
                "HexRoom Signature Residence Quận 7",
                "104 Lâm Văn Bền, Phường Tân Quy", "Quận 7", "Hồ Chí Minh",
                "Căn Hộ Mini 1PN Sang Trọng — Liền Kề Phú Mỹ Hưng",
                "Căn hộ mini 1 phòng ngủ tách biệt phòng khách và bếp. Cửa kính lớn đón ánh sáng tự nhiên ngập tràn, nội thất thông minh phong cách Bắc Âu. Gần trường ĐH Tôn Đức Thắng, RMIT.",
                RoomType.APARTMENT,
                new BigDecimal("6800000"),
                new BigDecimal("42.0"),
                3,
                RoomCosts.builder()
                        .deposit(new BigDecimal("6800000"))
                        .electricityPerKwh(new BigDecimal("4000"))
                        .waterPerM3(new BigDecimal("22000"))
                        .internetMonthly(new BigDecimal("120000"))
                        .parkingMonthly(new BigDecimal("150000"))
                        .serviceMonthly(new BigDecimal("200000"))
                        .paymentCycleMonths(1)
                        .houseRules("Hợp đồng tối thiểu 6 tháng, cho phép nuôi thú cưng nhỏ.")
                        .feeNotes("Miễn phí phòng gym và khu sinh hoạt chung.")
                        .build(),
                List.of(
                        "https://images.unsplash.com/photo-1502005229762-ee152da915ba?w=1200",
                        "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=1200"
                ),
                Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Tủ lạnh"), amenityMap.get("Bếp riêng"), amenityMap.get("Thang máy"), amenityMap.get("Bảo vệ 24/7"))
        );

        // Room 4: Coliving Thủ Đức
        createRentalAndRoom(
                landlord,
                "Nhà Chia Sẻ HexColiving Thủ Đức",
                "18 Đường Số 6, Phường Linh Trung", "TP. Thủ Đức", "Hồ Chí Minh",
                "Phòng Ở Ghép Tiêu Chuẩn Cao — Nam/Nữ Riêng Tầng",
                "Mô hình Coliving văn minh, hiện đại. Mỗi người một giường tầng cao cấp có rèm che riêng tư, nệm cao su non, đèn đọc sách, ổ cắm USB, tủ locker có khóa.",
                RoomType.SHARED,
                new BigDecimal("1850000"),
                new BigDecimal("50.0"),
                4,
                RoomCosts.builder()
                        .deposit(new BigDecimal("1850000"))
                        .electricityPerKwh(BigDecimal.ZERO)
                        .waterPerM3(BigDecimal.ZERO)
                        .internetMonthly(BigDecimal.ZERO)
                        .parkingMonthly(new BigDecimal("100000"))
                        .serviceMonthly(BigDecimal.ZERO)
                        .paymentCycleMonths(1)
                        .houseRules("Nói không với hút thuốc trong nhà. Giữ im lặng sau 23h.")
                        .feeNotes("Giá đã bao trọn gói điện, nước, internet.")
                        .build(),
                List.of(
                        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200",
                        "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200"
                ),
                Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Wifi tốc độ cao"), amenityMap.get("Bãi giữ xe"))
        );

        // Room 5: Studio Cầu Giấy Hà Nội
        createRentalAndRoom(
                landlord,
                "HexApartment Trần Thái Tông",
                "68 Ngõ 44 Trần Thái Tông, Dịch Vọng", "Quận Cầu Giấy", "Hà Nội",
                "Studio Trung Tâm Cầu Giấy — Ngõ Rộng Ô Tô Đỗ Cửa",
                "Phòng studio khép kín 32m² tại ngõ phố ẩm thực Trần Thái Tông. Trang bị đầy đủ đồ điện máy mới tinh: tivi, điều hòa 2 chiều, bình nóng lạnh Ariston, bếp từ.",
                RoomType.STUDIO,
                new BigDecimal("4500000"),
                new BigDecimal("32.0"),
                2,
                RoomCosts.builder()
                        .deposit(new BigDecimal("4500000"))
                        .electricityPerKwh(new BigDecimal("4000"))
                        .waterPerM3(new BigDecimal("30000"))
                        .internetMonthly(new BigDecimal("100000"))
                        .parkingMonthly(new BigDecimal("100000"))
                        .serviceMonthly(new BigDecimal("100000"))
                        .paymentCycleMonths(1)
                        .houseRules("Tối đa 2 xe máy, không hút thuốc lá trong phòng.")
                        .feeNotes("Thanh toán tiền nhà đầu tháng.")
                        .build(),
                List.of(
                        "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200",
                        "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200"
                ),
                Set.of(amenityMap.get("Máy lạnh"), amenityMap.get("Thang máy"), amenityMap.get("Khóa vân tay"), amenityMap.get("Bếp riêng"))
        );

        // Room 6: Nam Từ Liêm Hà Nội
        createRentalAndRoom(
                landlord,
                "Khu Nhà Trọ Sinh Viên Mỹ Đình",
                "29 Ngõ 20 đường Mỹ Đình", "Quận Nam Từ Liêm", "Hà Nội",
                "Phòng Trọ Khép Kín Gần Keangnam & ĐH Sư Phạm",
                "Phòng trọ diện tích 22m² có gác lửng, giá hạt dẻ thích hợp cho sinh viên hoặc các bạn mới đi làm. Có ban công phơi đồ thoáng mát, khu dân trí cao yên tĩnh.",
                RoomType.PRIVATE,
                new BigDecimal("2500000"),
                new BigDecimal("22.0"),
                2,
                RoomCosts.builder()
                        .deposit(new BigDecimal("2500000"))
                        .electricityPerKwh(new BigDecimal("3800"))
                        .waterPerM3(new BigDecimal("25000"))
                        .internetMonthly(new BigDecimal("70000"))
                        .parkingMonthly(new BigDecimal("80000"))
                        .serviceMonthly(new BigDecimal("50000"))
                        .paymentCycleMonths(1)
                        .houseRules("Khóa cổng lúc 23h30.")
                        .feeNotes("Tiền cọc 1 tháng, thanh toán hàng tháng.")
                        .build(),
                List.of(
                        "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200",
                        "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200"
                ),
                Set.of(amenityMap.get("Gác lửng"), amenityMap.get("Ban công"), amenityMap.get("Bãi giữ xe"))
        );

        log.info("HexRoom seed completed successfully with 6 rentals and rooms!");
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
