package com.hexroom.backend.repository;

import com.hexroom.backend.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LocationRepository extends JpaRepository<Location, UUID> {

    @Query("SELECT DISTINCT l.district FROM Location l WHERE l.district IS NOT NULL ORDER BY l.district")
    List<String> findDistinctDistricts();

    @Query("SELECT DISTINCT l.city FROM Location l WHERE l.city IS NOT NULL ORDER BY l.city")
    List<String> findDistinctCities();
}
