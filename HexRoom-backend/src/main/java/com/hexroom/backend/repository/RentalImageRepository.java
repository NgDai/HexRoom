package com.hexroom.backend.repository;

import com.hexroom.backend.entity.RentalImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RentalImageRepository extends JpaRepository<RentalImage, UUID> {

    List<RentalImage> findByRentalId(UUID rentalId);
}
