package com.hexroom.backend.repository;
import com.hexroom.backend.entity.RoomInspection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface RoomInspectionRepository extends JpaRepository<RoomInspection, UUID> {
    List<RoomInspection> findByRoomIdOrderByRecordedAtDesc(UUID roomId);
}
