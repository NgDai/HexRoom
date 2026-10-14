package com.hexroom.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "roommate_reports") @Getter @Setter @NoArgsConstructor
public class RoommateReport {
    public enum Status { OPEN, REVIEWING, RESOLVED }
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(nullable = false) private RoommateConnection connection;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(nullable = false) private User reporter;
    @Column(nullable = false, length = 2000) private String reason;
    @ManyToOne(fetch = FetchType.LAZY) private RoommateMessage message;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Status status;
    @Column(nullable = false) private LocalDateTime createdAt;
    @Column(length = 2000) private String resolution;
    @ManyToOne(fetch = FetchType.LAZY) private User reviewedBy;
    private LocalDateTime reviewedAt;
}
