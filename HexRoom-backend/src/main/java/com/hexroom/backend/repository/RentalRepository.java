package com.hexroom.backend.repository;

import com.hexroom.backend.entity.Rental;
import com.hexroom.backend.entity.enums.RentalStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RentalRepository extends JpaRepository<Rental, UUID>, JpaSpecificationExecutor<Rental> {

    @Override
    @EntityGraph(attributePaths = {"location", "owner"})
    Page<Rental> findAll(Specification<Rental> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"location", "owner"})
    Optional<Rental> findById(UUID id);

    Page<Rental> findByOwnerId(UUID ownerId, Pageable pageable);

    boolean existsByOwnerId(UUID ownerId);

    boolean existsByTitle(String title);

    java.util.List<Rental> findByTitle(String title);

    Page<Rental> findByStatus(RentalStatus status, Pageable pageable);
}
