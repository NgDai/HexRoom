package com.hexroom.backend.service;

import com.hexroom.backend.dto.tenancy.CreateInvoiceRequest;
import com.hexroom.backend.dto.tenancy.InvoiceResponse;
import com.hexroom.backend.entity.ContractServiceSubscription;
import com.hexroom.backend.entity.RentalContract;
import com.hexroom.backend.entity.RentalInvoice;
import com.hexroom.backend.entity.RentalInvoiceItem;
import com.hexroom.backend.entity.RoomService;
import com.hexroom.backend.entity.enums.ContractStatus;
import com.hexroom.backend.entity.enums.InvoiceStatus;
import com.hexroom.backend.exception.BadRequestException;
import com.hexroom.backend.exception.ForbiddenException;
import com.hexroom.backend.exception.ResourceNotFoundException;
import com.hexroom.backend.repository.ContractServiceSubscriptionRepository;
import com.hexroom.backend.repository.RentalContractRepository;
import com.hexroom.backend.repository.RentalInvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Hoá đơn tiền phòng + dịch vụ theo tháng.
 *
 * Quy tắc: mỗi hợp đồng chỉ có một hoá đơn cho một kỳ (tháng/năm). Dịch vụ mặc định
 * lấy theo đăng ký của người thuê; chủ trọ có thể truyền số lượng/đơn giá riêng khi lập.
 */
@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final RentalInvoiceRepository invoices;
    private final RentalContractRepository contracts;
    private final ContractServiceSubscriptionRepository subscriptions;

    @Transactional
    public InvoiceResponse create(UUID contractId, UUID landlordId, CreateInvoiceRequest req) {
        RentalContract contract = requireContract(contractId);
        if (!contract.getLandlord().getId().equals(landlordId)) {
            throw new ForbiddenException("Chỉ chủ trọ mới được lập hoá đơn");
        }
        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new BadRequestException("Chỉ lập hoá đơn cho hợp đồng đang hiệu lực");
        }
        if (invoices.existsByContractIdAndBillingYearAndBillingMonth(contractId, req.billingYear(), req.billingMonth())) {
            throw new BadRequestException("Kỳ này đã có hoá đơn. Hãy dùng chức năng cập nhật.");
        }

        RentalInvoice invoice = RentalInvoice.builder()
                .invoiceCode(nextCode(req.billingYear(), req.billingMonth()))
                .contract(contract)
                .billingMonth(req.billingMonth())
                .billingYear(req.billingYear())
                .dueDate(req.dueDate() != null ? req.dueDate() : defaultDueDate(req.billingYear(), req.billingMonth(), contract.getBillingDay()))
                .note(req.note())
                .otherAmount(req.otherAmount() != null ? req.otherAmount() : BigDecimal.ZERO)
                .status(invoiceStatus(contract, req.dueDate()))
                .build();

        // Tiền phòng
        BigDecimal roomAmount = contract.getMonthlyRent() != null ? contract.getMonthlyRent() : BigDecimal.ZERO;
        invoice.getItems().add(RentalInvoiceItem.builder()
                .invoice(invoice)
                .name("Tiền phòng tháng " + req.billingMonth() + "/" + req.billingYear())
                .category(null)
                .quantity(BigDecimal.ONE)
                .unit("tháng")
                .unitPrice(roomAmount)
                .amount(roomAmount)
                .build());

        // Dịch vụ
        BigDecimal serviceTotal = BigDecimal.ZERO;
        if (req.items() != null && !req.items().isEmpty()) {
            for (CreateInvoiceRequest.ItemInput input : req.items()) {
                RoomService service = resolveService(contract, input.serviceId());
                BigDecimal qty = input.quantity() != null ? input.quantity() : BigDecimal.ONE;
                BigDecimal price = input.unitPrice() != null ? input.unitPrice()
                        : (service.getUnitPrice() != null ? service.getUnitPrice() : BigDecimal.ZERO);
                BigDecimal amount = qty.multiply(price);
                serviceTotal = serviceTotal.add(amount);
                invoice.getItems().add(RentalInvoiceItem.builder()
                        .invoice(invoice)
                        .serviceId(service.getId())
                        .name(service.getName())
                        .category(service.getCategory())
                        .quantity(qty)
                        .unit(service.getUnit())
                        .unitPrice(price)
                        .amount(amount)
                        .build());
            }
        } else {
            for (ContractServiceSubscription sub : subscriptions.findByContractIdAndSubscribedTrue(contractId)) {
                RoomService service = sub.getService();
                if (service == null || !Boolean.TRUE.equals(service.getActive())) continue;
                BigDecimal price = service.getUnitPrice() != null ? service.getUnitPrice() : BigDecimal.ZERO;
                serviceTotal = serviceTotal.add(price);
                invoice.getItems().add(RentalInvoiceItem.builder()
                        .invoice(invoice)
                        .serviceId(service.getId())
                        .name(service.getName())
                        .category(service.getCategory())
                        .quantity(BigDecimal.ONE)
                        .unit(service.getUnit())
                        .unitPrice(price)
                        .amount(price)
                        .build());
            }
        }

        invoice.setRoomAmount(roomAmount);
        invoice.setServiceAmount(serviceTotal);
        invoice.setTotalAmount(roomAmount.add(serviceTotal).add(invoice.getOtherAmount()));

        return InvoiceResponse.from(invoices.save(invoice));
    }

    @Transactional
    public InvoiceResponse update(UUID invoiceId, UUID landlordId, CreateInvoiceRequest req) {
        RentalInvoice invoice = requireInvoice(invoiceId);
        if (!invoice.getContract().getLandlord().getId().equals(landlordId)) {
            throw new ForbiddenException("Chỉ chủ trọ mới được sửa hoá đơn");
        }
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BadRequestException("Không thể sửa hoá đơn đã thanh toán");
        }
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new BadRequestException("Hoá đơn đã bị huỷ");
        }
        if ((!req.billingMonth().equals(invoice.getBillingMonth()) || !req.billingYear().equals(invoice.getBillingYear()))
                && invoices.existsByContractIdAndBillingYearAndBillingMonth(invoice.getContract().getId(), req.billingYear(), req.billingMonth())) {
            throw new BadRequestException("Kỳ mới đã có hoá đơn khác");
        }

        invoice.setBillingMonth(req.billingMonth());
        invoice.setBillingYear(req.billingYear());
        if (req.dueDate() != null) invoice.setDueDate(req.dueDate());
        if (req.note() != null) invoice.setNote(req.note());
        invoice.setOtherAmount(req.otherAmount() != null ? req.otherAmount() : BigDecimal.ZERO);

        // Dựng lại toàn bộ dòng tiền để tránh cộng dồn sai khi sửa nhiều lần.
        invoice.getItems().clear();
        String period = req.billingMonth() + "/" + req.billingYear();
        BigDecimal roomAmount = invoice.getContract().getMonthlyRent() != null ? invoice.getContract().getMonthlyRent() : BigDecimal.ZERO;
        invoice.getItems().add(RentalInvoiceItem.builder()
                .invoice(invoice).name("Tiền phòng tháng " + period)
                .quantity(BigDecimal.ONE).unit("tháng").unitPrice(roomAmount).amount(roomAmount).build());

        BigDecimal serviceTotal = BigDecimal.ZERO;
        if (req.items() != null) {
            for (CreateInvoiceRequest.ItemInput input : req.items()) {
                RoomService service = resolveService(invoice.getContract(), input.serviceId());
                BigDecimal qty = input.quantity() != null ? input.quantity() : BigDecimal.ONE;
                BigDecimal price = input.unitPrice() != null ? input.unitPrice()
                        : (service.getUnitPrice() != null ? service.getUnitPrice() : BigDecimal.ZERO);
                BigDecimal amount = qty.multiply(price);
                serviceTotal = serviceTotal.add(amount);
                invoice.getItems().add(RentalInvoiceItem.builder()
                        .invoice(invoice).serviceId(service.getId()).name(service.getName())
                        .category(service.getCategory()).quantity(qty).unit(service.getUnit())
                        .unitPrice(price).amount(amount).build());
            }
        }
        invoice.setRoomAmount(roomAmount);
        invoice.setServiceAmount(serviceTotal);
        invoice.setTotalAmount(roomAmount.add(serviceTotal).add(invoice.getOtherAmount()));
        return InvoiceResponse.from(invoices.saveAndFlush(invoice));
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> listForContract(UUID contractId, UUID userId) {
        RentalContract contract = requireContract(contractId);
        requireParticipant(contract, userId);
        return invoices.findByContractIdOrderByBillingYearDescBillingMonthDesc(contractId).stream()
                .map(InvoiceResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> listForTenant(UUID tenantId) {
        return invoices.findByContractTenantIdOrderByBillingYearDescBillingMonthDesc(tenantId).stream()
                .map(InvoiceResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> listForLandlord(UUID landlordId) {
        return invoices.findByContractLandlordIdOrderByBillingYearDescBillingMonthDesc(landlordId).stream()
                .map(InvoiceResponse::from).toList();
    }

    /** Người thuê báo đã chuyển tiền. Chỉ chuyển được sang TENANT_CONFIRMED. */
    @Transactional
    public InvoiceResponse tenantConfirmPaid(UUID invoiceId, UUID tenantId, String paymentMethod, String note) {
        RentalInvoice invoice = requireInvoice(invoiceId);
        RentalContract contract = invoice.getContract();
        if (!contract.getTenant().getId().equals(tenantId)) {
            throw new ForbiddenException("Chỉ người thuê mới được xác nhận hoá đơn");
        }
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BadRequestException("Hoá đơn đã được chủ trọ xác nhận thanh toán");
        }
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new BadRequestException("Hoá đơn đã bị huỷ");
        }
        invoice.setStatus(InvoiceStatus.TENANT_CONFIRMED);
        invoice.setTenantConfirmedAt(LocalDateTime.now());
        invoice.setPaymentMethod(paymentMethod);
        if (note != null && !note.isBlank()) {
            invoice.setNote(note);
        }
        return InvoiceResponse.from(invoices.save(invoice));
    }

    /** Chủ trọ xác nhận đã nhận tiền. Đây là mốc duy nhất đánh dấu PAID. */
    @Transactional
    public InvoiceResponse landlordMarkPaid(UUID invoiceId, UUID landlordId, boolean allowWithoutTenantConfirm) {
        RentalInvoice invoice = requireInvoice(invoiceId);
        RentalContract contract = invoice.getContract();
        if (!contract.getLandlord().getId().equals(landlordId)) {
            throw new ForbiddenException("Chỉ chủ trọ mới được xác nhận thanh toán");
        }
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BadRequestException("Hoá đơn này đã được đánh dấu thanh toán");
        }
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new BadRequestException("Hoá đơn đã bị huỷ");
        }
        if (invoice.getStatus() != InvoiceStatus.TENANT_CONFIRMED && !allowWithoutTenantConfirm) {
            throw new BadRequestException("Người thuê chưa xác nhận chuyển tiền cho hoá đơn này");
        }
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(LocalDateTime.now());
        return InvoiceResponse.from(invoices.saveAndFlush(invoice));
    }

    @Transactional
    public InvoiceResponse cancel(UUID invoiceId, UUID landlordId, String reason) {
        RentalInvoice invoice = requireInvoice(invoiceId);
        if (!invoice.getContract().getLandlord().getId().equals(landlordId)) {
            throw new ForbiddenException("Chỉ chủ trọ mới được huỷ hoá đơn");
        }
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BadRequestException("Không thể huỷ hoá đơn đã thanh toán");
        }
        invoice.setStatus(InvoiceStatus.CANCELLED);
        if (reason != null && !reason.isBlank()) invoice.setNote(reason);
        return InvoiceResponse.from(invoices.save(invoice));
    }

    /** Đánh dấu quá hạn cho các hoá đơn đã tới hạn mà chưa được xác nhận thanh toán. */
    @Transactional
    public int refreshOverdue() {
        LocalDate today = LocalDate.now();
        List<RentalInvoice> pending = new ArrayList<>();
        for (RentalInvoice inv : invoices.findAll()) {
            if (inv.getDueDate() != null
                    && inv.getDueDate().isBefore(today)
                    && (inv.getStatus() == InvoiceStatus.ISSUED || inv.getStatus() == InvoiceStatus.TENANT_CONFIRMED)) {
                inv.setStatus(InvoiceStatus.OVERDUE);
                pending.add(inv);
            }
        }
        invoices.saveAll(pending);
        return pending.size();
    }

    // ---------------------------------------------------------------- helpers

    private RoomService resolveService(RentalContract contract, UUID serviceId) {
        RoomService service = subscriptions.findByContractId(contract.getId()).stream()
                .map(ContractServiceSubscription::getService)
                .filter(s -> s.getId().equals(serviceId))
                .findFirst()
                // Dịch vụ có thể chưa từng được đăng ký nhưng chủ trọ vẫn muốn tính cho tháng này.
                .orElse(null);
        if (service == null) {
            throw new BadRequestException("Dịch vụ không thuộc phòng của hợp đồng này");
        }
        return service;
    }

    private RentalInvoice requireInvoice(UUID id) {
        return invoices.findById(id).orElseThrow(() -> new ResourceNotFoundException("Invoice", "id", id));
    }

    private RentalContract requireContract(UUID id) {
        return contracts.findById(id).orElseThrow(() -> new ResourceNotFoundException("Contract", "id", id));
    }

    private void requireParticipant(RentalContract contract, UUID userId) {
        boolean allowed = contract.getTenant().getId().equals(userId) || contract.getLandlord().getId().equals(userId);
        if (!allowed) throw new ForbiddenException("Bạn không thuộc hợp đồng này");
    }

    private LocalDate defaultDueDate(int year, int month, Integer billingDay) {
        int day = billingDay != null ? Math.min(28, Math.max(1, billingDay)) : 5;
        return LocalDate.of(year, month, day).plusMonths(1);
    }

    /** Hoá đơn lập lùi ngày (kỳ đã qua) thì mở luôn ở trạng thái quá hạn. */
    private InvoiceStatus invoiceStatus(RentalContract contract, LocalDate requestedDueDate) {
        LocalDate due = requestedDueDate != null
                ? requestedDueDate
                : defaultDueDate(LocalDate.now().getYear(), LocalDate.now().getMonthValue(), contract.getBillingDay());
        return due.isBefore(LocalDate.now()) ? InvoiceStatus.OVERDUE : InvoiceStatus.ISSUED;
    }

    private String nextCode(int year, int month) {
        return "HDT-" + year + String.format("%02d", month) + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }
}
