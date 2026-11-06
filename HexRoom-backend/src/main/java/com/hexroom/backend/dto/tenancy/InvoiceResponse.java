package com.hexroom.backend.dto.tenancy;

import com.hexroom.backend.entity.RentalInvoice;
import com.hexroom.backend.entity.RentalInvoiceItem;
import com.hexroom.backend.entity.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record InvoiceResponse(
        UUID id,
        String invoiceCode,
        UUID contractId,
        String contractCode,
        UUID roomId,
        String roomName,
        String tenantName,
        String landlordName,
        Integer billingMonth,
        Integer billingYear,
        BigDecimal roomAmount,
        BigDecimal serviceAmount,
        BigDecimal otherAmount,
        BigDecimal totalAmount,
        InvoiceStatus status,
        LocalDate dueDate,
        String note,
        String paymentMethod,
        LocalDateTime tenantConfirmedAt,
        LocalDateTime paidAt,
        LocalDateTime createdAt,
        List<Item> items
) {

    public record Item(
            UUID id,
            UUID serviceId,
            String name,
            String category,
            BigDecimal quantity,
            String unit,
            BigDecimal unitPrice,
            BigDecimal amount
    ) {
        static Item of(RentalInvoiceItem i) {
            return new Item(i.getId(), i.getServiceId(), i.getName(),
                    i.getCategory() != null ? i.getCategory().name() : null,
                    i.getQuantity(), i.getUnit(), i.getUnitPrice(), i.getAmount());
        }
    }

    public static InvoiceResponse from(RentalInvoice inv) {
        var contract = inv.getContract();
        var room = contract != null ? contract.getRoom() : null;
        return new InvoiceResponse(
                inv.getId(),
                inv.getInvoiceCode(),
                contract != null ? contract.getId() : null,
                contract != null ? contract.getContractCode() : null,
                room != null ? room.getId() : null,
                room != null ? room.getRoomName() : null,
                contract != null && contract.getTenant() != null ? contract.getTenant().getFullName() : null,
                contract != null && contract.getLandlord() != null ? contract.getLandlord().getFullName() : null,
                inv.getBillingMonth(),
                inv.getBillingYear(),
                inv.getRoomAmount(),
                inv.getServiceAmount(),
                inv.getOtherAmount(),
                inv.getTotalAmount(),
                inv.getStatus(),
                inv.getDueDate(),
                inv.getNote(),
                inv.getPaymentMethod(),
                inv.getTenantConfirmedAt(),
                inv.getPaidAt(),
                inv.getCreatedAt(),
                inv.getItems() != null ? inv.getItems().stream().map(Item::of).toList() : List.of()
        );
    }
}
