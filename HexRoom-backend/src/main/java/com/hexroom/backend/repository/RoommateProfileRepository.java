package com.hexroom.backend.repository;
import com.hexroom.backend.entity.RoommateProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface RoommateProfileRepository extends JpaRepository<RoommateProfile, UUID> {
    Optional<RoommateProfile> findByUserId(UUID userId);
    List<RoommateProfile> findByVisibleTrueAndCityIgnoreCaseOrderById(String city);
    List<RoommateProfile> findByVisibleTrueOrderById();
}
