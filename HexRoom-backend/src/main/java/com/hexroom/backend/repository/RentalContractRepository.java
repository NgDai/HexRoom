package com.hexroom.backend.repository;

import com.hexroom.backend.entity.RentalContract;
import com.hexroom.backend.entity.enums.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RentalContractRepository extends JpaRepository<RentalContract, UUID> {

    List<RentalContract> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    List<RentalContract> findByTenantIdAndStatusOrderByCreatedAtDesc(UUID tenantId, ContractStatus status);

    List<RentalContract> findByLandlordIdOrderByCreatedAtDesc(UUID landlordId);

    List<RentalContract> findByLandlordIdAndStatusOrderByCreatedAtDesc(UUID landlordId, ContractStatus status);

    Optional<RentalContract> findFirstByRoomIdAndStatus(UUID roomId, ContractStatus status);

    Optional<RentalContract> findFirstByRoomIdAndStatusIn(UUID roomId, Collection<ContractStatus> statuses);

    boolean existsByRoomIdAndStatusIn(UUID roomId, Collection<ContractStatus> statuses);

    @Query("SELECT c FROM RentalContract c WHERE c.status = :status AND c.endDate IS NOT NULL AND c.endDate <= :today")
    List<RentalContract> findExpiring(@Param("status") ContractStatus status, @Param("today") java.time.LocalDate today);

    long countByRoomIdAndStatus(UUID roomId, ContractStatus status);
}
