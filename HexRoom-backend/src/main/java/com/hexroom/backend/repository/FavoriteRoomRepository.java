package com.hexroom.backend.repository;

import com.hexroom.backend.entity.FavoriteRoom;
import com.hexroom.backend.entity.FavoriteRoomId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface FavoriteRoomRepository extends JpaRepository<FavoriteRoom, FavoriteRoomId> {

    Page<FavoriteRoom> findByIdUserId(UUID userId, Pageable pageable);

    boolean existsByIdUserIdAndIdRoomId(UUID userId, UUID roomId);

    void deleteByIdUserIdAndIdRoomId(UUID userId, UUID roomId);
}
