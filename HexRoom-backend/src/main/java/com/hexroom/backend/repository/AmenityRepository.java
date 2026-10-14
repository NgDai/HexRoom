package com.hexroom.backend.repository;

import com.hexroom.backend.entity.Amenity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AmenityRepository extends JpaRepository<Amenity, UUID> {

    Optional<Amenity> findByNameIgnoreCase(String name);

    List<Amenity> findByNameInIgnoreCase(Collection<String> names);

    boolean existsByNameIgnoreCase(String name);
}
