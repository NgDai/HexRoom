package com.hexroom.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "roommate_connections", uniqueConstraints = @UniqueConstraint(columnNames = "pair_key"))
@Getter @Setter @NoArgsConstructor
public class RoommateConnection {
    public enum Status { PENDING, ACCEPTED, DECLINED, CANCELLED, ENDED }
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "pair_key", nullable = false, length = 73) private String pairKey;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(nullable = false) private User sender;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(nullable = false) private User recipient;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Status status;
    @Column(nullable = false) private LocalDateTime createdAt;
    @Column(nullable = false) private LocalDateTime updatedAt;
    private LocalDateTime acceptedAt;
    @Column(length = 500) private String introduction;
}
