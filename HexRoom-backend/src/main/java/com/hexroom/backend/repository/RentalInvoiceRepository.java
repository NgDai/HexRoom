package com.hexroom.backend.repository;

import com.hexroom.backend.entity.RentalInvoice;
import com.hexroom.backend.entity.enums.InvoiceStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RentalInvoiceRepository extends JpaRepository<RentalInvoice, UUID> {

    @EntityGraph(attributePaths = {"contract", "contract.room", "contract.tenant", "contract.landlord", "items"})
    List<RentalInvoice> findByContractIdOrderByBillingYearDescBillingMonthDesc(UUID contractId);

    @EntityGraph(attributePaths = {"contract", "contract.room", "contract.tenant", "contract.landlord", "items"})
    List<RentalInvoice> findByContractTenantIdOrderByBillingYearDescBillingMonthDesc(UUID tenantId);

    @EntityGraph(attributePaths = {"contract", "contract.room", "contract.tenant", "contract.landlord", "items"})
    List<RentalInvoice> findByContractLandlordIdOrderByBillingYearDescBillingMonthDesc(UUID landlordId);

    @EntityGraph(attributePaths = {"contract", "contract.room", "contract.tenant", "contract.landlord", "items"})
    Optional<RentalInvoice> findByContractIdAndBillingYearAndBillingMonth(UUID contractId, Integer year, Integer month);

    @Override
    @EntityGraph(attributePaths = {"contract", "contract.room", "contract.tenant", "contract.landlord", "items"})
    Optional<RentalInvoice> findById(UUID id);

    List<RentalInvoice> findByContractIdAndStatusIn(UUID contractId, Collection<InvoiceStatus> statuses);

    boolean existsByContractIdAndBillingYearAndBillingMonth(UUID contractId, Integer year, Integer month);

    long countByContractIdAndStatus(UUID contractId, InvoiceStatus status);
}
