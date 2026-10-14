package com.hexroom.backend.repository;
import com.hexroom.backend.entity.RoommateBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.*;
public interface RoommateBlockRepository extends JpaRepository<RoommateBlock, UUID> {
    boolean existsByBlockerIdAndBlockedId(UUID blocker, UUID blocked);
    void deleteByBlockerIdAndBlockedId(UUID blocker, UUID blocked);
    @Query("select b from RoommateBlock b where b.blocker.id = :userId or b.blocked.id = :userId")
    List<RoommateBlock> findInvolving(UUID userId);
}
