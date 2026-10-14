package com.hexroom.backend.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity @Table(name = "roommate_profiles") @Getter @Setter @NoArgsConstructor
public class RoommateProfile {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false, unique = true) private User user;
    @Column(nullable = false, length = 60) private String nickname;
    @Column(nullable = false, length = 120) private String city;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal budgetMin;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal budgetMax;
    @Column(nullable = false) private LocalDate moveInDate;
    private boolean smoking;
    private boolean hasPets;
    private boolean acceptSmoking;
    private boolean acceptPets;
    private boolean visible;
    @Column(length = 30) private String sleepSchedule;
}
