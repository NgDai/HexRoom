package com.hexroom.backend.repository;

import com.hexroom.backend.entity.Room;
import com.hexroom.backend.entity.enums.RoomStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID>, JpaSpecificationExecutor<Room> {

    List<Room> findByRentalId(UUID rentalId);

    Page<Room> findByStatus(RoomStatus status, Pageable pageable);

    @Modifying
    @Query("UPDATE Room r SET r.searchCount = r.searchCount + 1 WHERE r.id = :roomId")
    void incrementSearchCount(@Param("roomId") UUID roomId);
}
