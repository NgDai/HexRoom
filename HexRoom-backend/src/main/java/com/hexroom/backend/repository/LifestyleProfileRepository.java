package com.hexroom.backend.repository;

import com.hexroom.backend.entity.LifestyleProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LifestyleProfileRepository extends JpaRepository<LifestyleProfile, UUID> {

    Optional<LifestyleProfile> findByUserId(UUID userId);
}
