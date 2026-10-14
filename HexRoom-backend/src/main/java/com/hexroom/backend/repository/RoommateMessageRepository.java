package com.hexroom.backend.repository;
import com.hexroom.backend.entity.RoommateMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import java.util.*;
public interface RoommateMessageRepository extends JpaRepository<RoommateMessage, Long> {
    List<RoommateMessage> findByConnectionIdOrderByIdDesc(UUID id, Pageable page);
    List<RoommateMessage> findByConnectionIdAndIdLessThanOrderByIdDesc(UUID id, Long before, Pageable page);
    List<RoommateMessage> findByConnectionIdAndIdGreaterThanOrderByIdAsc(UUID id, Long after, Pageable page);
    Optional<RoommateMessage> findByConnectionIdAndSenderIdAndClientId(UUID connection, UUID sender, UUID clientId);
}
