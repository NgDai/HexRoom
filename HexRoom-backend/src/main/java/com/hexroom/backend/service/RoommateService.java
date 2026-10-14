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
    public record PublicProfile(UUID id, String nickname, String city, BigDecimal budgetMin, BigDecimal budgetMax,
            LocalDate moveInDate, boolean smoking, boolean hasPets, boolean acceptSmoking, boolean acceptPets,
            boolean visible, String sleepSchedule) {
        static PublicProfile of(RoommateProfile p) { return new PublicProfile(p.getId(), p.getNickname(), p.getCity(), p.getBudgetMin(), p.getBudgetMax(),
                p.getMoveInDate(), p.isSmoking(), p.isHasPets(), p.isAcceptSmoking(), p.isAcceptPets(), p.isVisible(), p.getSleepSchedule()); }
    }
    public record Suggestion(PublicProfile profile, List<String> matches, List<String> discuss) {}
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
        RoommateProfile me = profiles.findByUserId(userId).orElseThrow(() -> new BadRequestException("Hãy lưu hồ sơ ở ghép trước"));
        if (!me.isVisible()) return List.of();
        Set<UUID> excluded = new HashSet<>();
        blocks.findInvolving(userId).forEach(block -> {
            excluded.add(block.getBlocker().getId()); excluded.add(block.getBlocked().getId());
        });
        return profiles.findByVisibleTrueAndCityIgnoreCaseOrderById(me.getCity()).stream()
                .filter(other -> !other.getId().equals(me.getId()) && !excluded.contains(other.getUser().getId())
                        && other.getUser().getStatus() == com.hexroom.backend.entity.enums.UserStatus.ACTIVE && compatible(me, other)).limit(30)
                .map(other -> new Suggestion(PublicProfile.of(other), List.of("Cùng thành phố", "Khoảng ngân sách giao nhau", "Đáp ứng điều kiện hút thuốc và thú cưng của cả hai"),
                        List.of(me.getSleepSchedule().equals(other.getSleepSchedule()) ? "Giờ ngủ tương đồng; cần thống nhất giờ yên tĩnh" : "Khác lịch ngủ; cần trao đổi",
                                "Ngày chuyển vào chênh " + Math.abs(ChronoUnit.DAYS.between(me.getMoveInDate(), other.getMoveInDate())) + " ngày",
                                "Cần thống nhất khu vực cụ thể, tiền cọc và phần chi phí từng người"))).toList();
    }
}
