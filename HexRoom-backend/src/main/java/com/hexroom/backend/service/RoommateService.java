package com.hexroom.backend.service;
import com.hexroom.backend.dto.room.RoommateProfileRequest;
import com.hexroom.backend.entity.RoommateProfile;
import com.hexroom.backend.exception.BadRequestException;
import com.hexroom.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor
public class RoommateService {
    private final RoommateProfileRepository profiles;
    private final UserRepository users;
    private final RoommateBlockRepository blocks;
    private final LifestyleProfileRepository lifestyles;
    private final UserPreferenceRepository preferences;

    public record PublicProfile(UUID id, String nickname, String city, BigDecimal budgetMin, BigDecimal budgetMax,
            LocalDate moveInDate, boolean smoking, boolean hasPets, boolean acceptSmoking, boolean acceptPets,
            boolean visible, String sleepSchedule) {
        static PublicProfile of(RoommateProfile p) { return new PublicProfile(p.getId(), p.getNickname(), p.getCity(), p.getBudgetMin(), p.getBudgetMax(),
                p.getMoveInDate(), p.isSmoking(), p.isHasPets(), p.isAcceptSmoking(), p.isAcceptPets(), p.isVisible(), p.getSleepSchedule()); }
    }

    public record UserView(UUID id, String fullName, String avatarUrl, String gender, String email, String phone) {}
    public record LifestyleView(Boolean smoking, Boolean drinking, Boolean pets_allowed, String sleep_schedule,
            String cleanliness, String social_level, String noise_tolerance, String guest_frequency,
            List<String> interests, String deal_breakers) {}
    public record PreferenceView(BigDecimal budget_min, BigDecimal budget_max, String preferredLocation,
            List<String> preferred_districts, String room_type) {}

    public record Suggestion(
            UserView user,
            LifestyleView lifestyle,
            PreferenceView preference,
            PublicProfile profile,
            List<String> matches,
            List<String> discuss,
            int matchScore
    ) {}

    @Transactional(readOnly = true)
    public PublicProfile mine(UUID userId) { return profiles.findByUserId(userId).map(PublicProfile::of).orElse(null); }

    @Transactional
    public PublicProfile save(UUID userId, RoommateProfileRequest r) {
        if (!r.adultConfirmed()) throw new BadRequestException("Cần xác nhận từ 18 tuổi để tham gia");
        if (r.budgetMin().compareTo(r.budgetMax()) > 0) throw new BadRequestException("Ngân sách tối thiểu phải nhỏ hơn hoặc bằng tối đa");
        RoommateProfile p = profiles.findByUserId(userId).orElseGet(RoommateProfile::new);
        p.setUser(users.getReferenceById(userId)); p.setNickname(r.nickname().trim()); p.setCity(r.city().trim());
        p.setBudgetMin(r.budgetMin()); p.setBudgetMax(r.budgetMax()); p.setMoveInDate(r.moveInDate());
        p.setSmoking(r.smoking()); p.setHasPets(r.hasPets()); p.setAcceptSmoking(r.acceptSmoking()); p.setAcceptPets(r.acceptPets());
        p.setVisible(r.visible()); p.setSleepSchedule(r.sleepSchedule());
        return PublicProfile.of(profiles.save(p));
    }

    public static boolean compatible(RoommateProfile a, RoommateProfile b) {
        return a.isVisible() && b.isVisible() && a.getCity().equalsIgnoreCase(b.getCity())
                && a.getBudgetMin().compareTo(b.getBudgetMax()) <= 0 && b.getBudgetMin().compareTo(a.getBudgetMax()) <= 0
                && (!a.isSmoking() || b.isAcceptSmoking()) && (!b.isSmoking() || a.isAcceptSmoking())
                && (!a.isHasPets() || b.isAcceptPets()) && (!b.isHasPets() || a.isAcceptPets())
                && Math.abs(ChronoUnit.DAYS.between(a.getMoveInDate(), b.getMoveInDate())) <= 30;
    }

    @Transactional(readOnly = true)
    public List<Suggestion> suggestions(UUID userId) {
        RoommateProfile me = userId != null ? profiles.findByUserId(userId).orElse(null) : null;
        com.hexroom.backend.entity.LifestyleProfile myLife = userId != null ? lifestyles.findByUserId(userId).orElse(null) : null;
        com.hexroom.backend.entity.UserPreference myPref = userId != null ? preferences.findByUserId(userId).orElse(null) : null;

        String myCity = me != null && me.getCity() != null && !me.getCity().isBlank()
                ? me.getCity()
                : (myPref != null ? myPref.getPreferredLocation() : null);

        BigDecimal myMin = me != null && me.getBudgetMin() != null
                ? me.getBudgetMin()
                : (myPref != null && myPref.getBudgetMin() != null ? myPref.getBudgetMin() : null);

        BigDecimal myMax = me != null && me.getBudgetMax() != null
                ? me.getBudgetMax()
                : (myPref != null && myPref.getBudgetMax() != null ? myPref.getBudgetMax() : null);

        Boolean mySmoking = me != null ? me.isSmoking() : (myLife != null ? myLife.getSmoking() : null);
        Boolean myAcceptSmoking = me != null ? me.isAcceptSmoking() : null;

        Boolean myPets = me != null ? me.isHasPets() : (myLife != null ? myLife.getPetsAllowed() : null);
        Boolean myAcceptPets = me != null ? me.isAcceptPets() : (myPref != null ? myPref.getPetFriendly() : null);

        String mySleep = me != null && me.getSleepSchedule() != null
                ? me.getSleepSchedule()
                : (myLife != null ? myLife.getSleepSchedule() : null);

        LocalDate myMoveIn = me != null ? me.getMoveInDate() : null;

        boolean hasAnyCriteria = (myCity != null && !myCity.isBlank()) || myMin != null || myMax != null
                || mySmoking != null || myPets != null || (mySleep != null && !mySleep.isBlank());

        Set<UUID> excluded = new HashSet<>();
        if (userId != null) {
            excluded.add(userId);
            blocks.findInvolving(userId).forEach(block -> {
                excluded.add(block.getBlocker().getId());
                excluded.add(block.getBlocked().getId());
            });
        }

        List<RoommateProfile> candidateProfiles;
        if (myCity != null && !myCity.isBlank()) {
            candidateProfiles = new ArrayList<>(profiles.findByVisibleTrueAndCityIgnoreCaseOrderById(myCity));
            List<RoommateProfile> allVisible = profiles.findByVisibleTrueOrderById();
            for (RoommateProfile p : allVisible) {
                if (candidateProfiles.stream().noneMatch(c -> c.getId().equals(p.getId()))) {
                    candidateProfiles.add(p);
                }
            }
        } else {
            candidateProfiles = profiles.findByVisibleTrueOrderById();
        }

        return candidateProfiles.stream()
                .filter(other -> (me == null || !other.getId().equals(me.getId()))
                        && !excluded.contains(other.getUser().getId())
                        && other.getUser().getStatus() == com.hexroom.backend.entity.enums.UserStatus.ACTIVE)
                .map(other -> {
                    com.hexroom.backend.entity.User u = other.getUser();
                    String name = (other.getNickname() != null && !other.getNickname().isBlank())
                            ? other.getNickname()
                            : (u.getFullName() != null ? u.getFullName() : "Bạn cùng phòng");
                    UserView userView = new UserView(u.getId(), name, u.getAvatarUrl(), u.getGender(), u.getEmail(), u.getPhone());

                    LifestyleView lifeView = lifestyles.findByUserId(u.getId())
                            .map(l -> new LifestyleView(l.getSmoking(), l.getDrinking(), l.getPetsAllowed(),
                                    l.getSleepSchedule() != null ? l.getSleepSchedule() : other.getSleepSchedule(),
                                    l.getCleanliness(), l.getSocialLevel(), l.getNoiseTolerance(), l.getGuestFrequency(),
                                    l.getInterests() != null ? l.getInterests() : List.of(), l.getDealBreakers()))
                            .orElse(new LifestyleView(other.isSmoking(), false, other.isHasPets(), other.getSleepSchedule(),
                                    null, null, null, null, List.of(), null));

                    PreferenceView prefView = preferences.findByUserId(u.getId())
                            .map(p -> new PreferenceView(
                                    p.getBudgetMin() != null ? p.getBudgetMin() : other.getBudgetMin(),
                                    p.getBudgetMax() != null ? p.getBudgetMax() : other.getBudgetMax(),
                                    p.getPreferredLocation() != null ? p.getPreferredLocation() : other.getCity(),
                                    p.getPreferredDistricts() != null ? p.getPreferredDistricts() : List.of(),
                                    p.getRoomType()))
                            .orElse(new PreferenceView(other.getBudgetMin(), other.getBudgetMax(), other.getCity(), List.of(), null));

                    List<String> matchNotes = new ArrayList<>();
                    List<String> discussNotes = new ArrayList<>();
                    int score;

                    if (!hasAnyCriteria) {
                        score = 50;
                        matchNotes.add("Hồ sơ đang tìm bạn ở ghép công khai");
                        discussNotes.add("Tạo hồ sơ để tính tỷ lệ tương thích chính xác");
                    } else {
                        score = 0;

                        // 1. City / Location (Max 25 pts)
                        if (myCity != null && other.getCity() != null && !other.getCity().isBlank()) {
                            if (myCity.equalsIgnoreCase(other.getCity())) {
                                score += 25;
                                matchNotes.add("Cùng thành phố/khu vực " + other.getCity());
                            } else {
                                score -= 10;
                                discussNotes.add("Khác thành phố (" + other.getCity() + " vs " + myCity + ")");
                            }
                        } else {
                            score += 12;
                        }

                        // 2. Budget (Max 25 pts)
                        BigDecimal otherMin = other.getBudgetMin();
                        BigDecimal otherMax = other.getBudgetMax();
                        if (myMax != null && otherMax != null) {
                            BigDecimal effectiveMyMin = myMin != null ? myMin : myMax.multiply(BigDecimal.valueOf(0.5));
                            BigDecimal effectiveOtherMin = otherMin != null ? otherMin : otherMax.multiply(BigDecimal.valueOf(0.5));
                            BigDecimal overlapStart = effectiveMyMin.max(effectiveOtherMin);
                            BigDecimal overlapEnd = myMax.min(otherMax);

                            if (overlapEnd.compareTo(overlapStart) >= 0) {
                                score += 25;
                                matchNotes.add("Khoảng ngân sách giao nhau phù hợp");
                            } else {
                                BigDecimal gap = overlapStart.subtract(overlapEnd);
                                if (gap.compareTo(BigDecimal.valueOf(1000000)) <= 0) {
                                    score += 15;
                                    matchNotes.add("Ngân sách chênh lệch nhỏ (~1tr)");
                                } else if (gap.compareTo(BigDecimal.valueOf(2500000)) <= 0) {
                                    score += 5;
                                    discussNotes.add("Ngân sách chênh lệch " + (gap.longValue() / 1000000.0) + "tr");
                                } else {
                                    score -= 10;
                                    discussNotes.add("Khoảng ngân sách không tương thích");
                                }
                            }
                        } else {
                            score += 12;
                        }

                        // 3. Smoking (Max 15 pts)
                        boolean otherSmokes = other.isSmoking();
                        boolean otherAcceptsSmoke = other.isAcceptSmoking();
                        if (mySmoking != null) {
                            boolean meSmokes = mySmoking;
                            boolean meAcceptsSmoke = myAcceptSmoking != null ? myAcceptSmoking : !meSmokes;

                            if (!meSmokes && !otherSmokes) {
                                score += 15;
                                matchNotes.add("Cùng không hút thuốc");
                            } else if (meSmokes && otherSmokes) {
                                score += 12;
                                matchNotes.add("Thói quen hút thuốc tương đồng");
                            } else if ((!meSmokes && otherSmokes && meAcceptsSmoke) || (meSmokes && !otherSmokes && otherAcceptsSmoke)) {
                                score += 10;
                            } else {
                                score -= 15;
                                discussNotes.add("Xung đột thói quen hút thuốc");
                            }
                        } else {
                            score += 8;
                        }

                        // 4. Pets (Max 15 pts)
                        boolean otherPets = other.isHasPets();
                        boolean otherAcceptsPets = other.isAcceptPets();
                        if (myPets != null) {
                            boolean mePets = myPets;
                            boolean meAcceptsPets = myAcceptPets != null ? myAcceptPets : true;

                            if (mePets && otherPets) {
                                score += 15;
                                matchNotes.add("Cùng yêu thích nuôi thú cưng");
                            } else if (!mePets && !otherPets) {
                                score += 15;
                                matchNotes.add("Không nuôi thú cưng");
                            } else if ((mePets && !otherPets && otherAcceptsPets) || (!mePets && otherPets && meAcceptsPets)) {
                                score += 12;
                            } else {
                                score -= 10;
                                discussNotes.add("Xung đột về việc nuôi thú cưng");
                            }
                        } else {
                            score += 8;
                        }

                        // 5. Sleep Schedule (Max 10 pts)
                        if (mySleep != null && other.getSleepSchedule() != null && !other.getSleepSchedule().isBlank()) {
                            String s1 = mySleep.toUpperCase();
                            String s2 = other.getSleepSchedule().toUpperCase();
                            if (s1.equals(s2)) {
                                score += 10;
                                matchNotes.add("Giờ ngủ tương đồng");
                            } else if (s1.contains("FLEXIBLE") || s2.contains("FLEXIBLE") || s1.contains("LINH HOẠT") || s2.contains("LINH HOẠT")) {
                                score += 7;
                                matchNotes.add("Giờ giấc linh hoạt");
                            } else if ((s1.contains("EARLY") || s1.contains("SỚM")) && (s2.contains("LATE") || s2.contains("MUỘN") || s2.contains("KHUYA"))) {
                                score -= 5;
                                discussNotes.add("Khác lịch ngủ (ngủ sớm vs ngủ muộn)");
                            } else if ((s2.contains("EARLY") || s2.contains("SỚM")) && (s1.contains("LATE") || s1.contains("MUỘN") || s1.contains("KHUYA"))) {
                                score -= 5;
                                discussNotes.add("Khác lịch ngủ (ngủ sớm vs ngủ muộn)");
                            } else {
                                score += 5;
                            }
                        } else {
                            score += 5;
                        }

                        // 6. Move-in date (Max 10 pts)
                        if (myMoveIn != null && other.getMoveInDate() != null) {
                            long days = Math.abs(ChronoUnit.DAYS.between(myMoveIn, other.getMoveInDate()));
                            if (days == 0) {
                                score += 10;
                                matchNotes.add("Dọn vào cùng ngày");
                            } else if (days <= 7) {
                                score += 8;
                                matchNotes.add("Dọn vào chênh " + days + " ngày");
                            } else if (days <= 15) {
                                score += 5;
                                matchNotes.add("Dọn vào chênh " + days + " ngày");
                            } else if (days <= 30) {
                                score += 2;
                            } else {
                                discussNotes.add("Dọn vào chênh " + days + " ngày");
                            }
                        } else {
                            score += 5;
                        }

                        score = Math.max(25, Math.min(98, score));
                    }

                    return new Suggestion(userView, lifeView, prefView, PublicProfile.of(other), matchNotes, discussNotes, score);
                })
                .sorted((a, b) -> Integer.compare(b.matchScore(), a.matchScore()))
                .limit(40)
                .toList();
    }

    @Transactional(readOnly = true)
    public Suggestion getPublicProfile(UUID targetUserId) {
        com.hexroom.backend.entity.User u = users.findById(targetUserId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng"));
        RoommateProfile profile = profiles.findByUserId(targetUserId).orElse(null);
        String name = (profile != null && profile.getNickname() != null && !profile.getNickname().isBlank())
                ? profile.getNickname()
                : (u.getFullName() != null ? u.getFullName() : "Người dùng");
        UserView userView = new UserView(u.getId(), name, u.getAvatarUrl(), u.getGender(), u.getEmail(), u.getPhone());

        LifestyleView lifeView = lifestyles.findByUserId(u.getId())
                .map(l -> new LifestyleView(l.getSmoking(), l.getDrinking(), l.getPetsAllowed(),
                        l.getSleepSchedule() != null ? l.getSleepSchedule() : (profile != null ? profile.getSleepSchedule() : null),
                        l.getCleanliness(), l.getSocialLevel(), l.getNoiseTolerance(), l.getGuestFrequency(),
                        l.getInterests() != null ? l.getInterests() : List.of(), l.getDealBreakers()))
                .orElse(profile != null
                        ? new LifestyleView(profile.isSmoking(), false, profile.isHasPets(), profile.getSleepSchedule(),
                        null, null, null, null, List.of(), null)
                        : new LifestyleView(null, null, null, null, null, null, null, null, List.of(), null));

        PreferenceView prefView = preferences.findByUserId(u.getId())
                .map(p -> new PreferenceView(
                        p.getBudgetMin() != null ? p.getBudgetMin() : (profile != null ? profile.getBudgetMin() : null),
                        p.getBudgetMax() != null ? p.getBudgetMax() : (profile != null ? profile.getBudgetMax() : null),
                        p.getPreferredLocation() != null ? p.getPreferredLocation() : (profile != null ? profile.getCity() : null),
                        p.getPreferredDistricts() != null ? p.getPreferredDistricts() : List.of(),
                        p.getRoomType()))
                .orElse(profile != null
                        ? new PreferenceView(profile.getBudgetMin(), profile.getBudgetMax(), profile.getCity(), List.of(), null)
                        : new PreferenceView(null, null, null, List.of(), null));

        PublicProfile publicProfile = profile != null ? PublicProfile.of(profile) : null;
        List<String> matchNotes = List.of(profile != null && profile.isVisible() ? "Hồ sơ công khai tìm bạn ở ghép" : "Hồ sơ người dùng HexRoom");
        List<String> discussNotes = List.of("Liên hệ trực tiếp qua email hoặc số điện thoại để trao đổi chi tiết về tiền cọc, chi phí và thời gian chuyển vào");

        return new Suggestion(userView, lifeView, prefView, publicProfile, matchNotes, discussNotes, 85);
    }
}
