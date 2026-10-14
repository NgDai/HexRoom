package com.hexroom.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "roommate_messages", indexes = @Index(name = "idx_roommate_messages_connection", columnList = "connection_id,id"),
        uniqueConstraints = @UniqueConstraint(columnNames = {"connection_id", "sender_id", "client_id"}))
@Getter @Setter @NoArgsConstructor
public class RoommateMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "connection_id", nullable = false) private RoommateConnection connection;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "sender_id", nullable = false) private User sender;
    @Column(name = "client_id", nullable = false) private UUID clientId;
    @Column(nullable = false, length = 2000) private String content;
    @Column(nullable = false) private LocalDateTime createdAt;
}
