package com.hexroom.backend.repository;
import com.hexroom.backend.entity.RoommateConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.*;
import java.util.*;
public interface RoommateConnectionRepository extends JpaRepository<RoommateConnection, UUID> {
    Optional<RoommateConnection> findByPairKey(String pairKey);
    Page<RoommateConnection> findBySenderIdOrRecipientIdOrderByUpdatedAtDesc(UUID senderId, UUID recipientId, Pageable pageable);
}
