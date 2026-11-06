package com.hexroom.backend.repository;

import com.hexroom.backend.entity.ContractServiceSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContractServiceSubscriptionRepository extends JpaRepository<ContractServiceSubscription, UUID> {

    List<ContractServiceSubscription> findByContractId(UUID contractId);

    List<ContractServiceSubscription> findByContractIdAndSubscribedTrue(UUID contractId);

    Optional<ContractServiceSubscription> findByContractIdAndServiceId(UUID contractId, UUID serviceId);
}
