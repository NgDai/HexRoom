package com.hexroom.backend.repository;

import com.hexroom.backend.entity.RoomService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RoomServiceRepository extends JpaRepository<RoomService, UUID> {

    List<RoomService> findByRoomIdOrderByCreatedAtAsc(UUID roomId);

    List<RoomService> findByRoomIdAndActiveTrueOrderByCreatedAtAsc(UUID roomId);
}
