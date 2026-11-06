import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Building2, CalendarClock, ClipboardList, CreditCard, FileSignature, Home, Loader2,
    MapPin, Package, ScrollText, Sparkles, User,
} from 'lucide-react';
import { Header } from '@/app/features/home/components/Header';
import { useAuth } from '@/app/context/useAuth';
import {
    listContractServices, listContractInvoices, listMyContracts, listMyRooms,
    setServiceSubscription,
    type Contract, type Invoice, type RoomServiceItem,
} from '@/lib/tenancy-api';
import {
    ContractStatusBadge, EmptyState, ErrorBanner, InfoRow, InvoiceStatusBadge, Money,
    SectionCard, StatTile, formatDate, formatDateTime,
} from './components/TenancyUI';
import { InvoiceActionModal } from './components/InvoiceModals';
import { TenantConfirmModal } from './components/ContractModals';

type Tab = 'rooms' | 'contracts' | 'invoices' | 'services';

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: 'rooms', label: 'Phòng của tôi', icon: Home },
    { id: 'contracts', label: 'Hợp đồng', icon: FileSignature },
    { id: 'invoices', label: 'Hoá đơn', icon: CreditCard },
    { id: 'services', label: 'Dịch vụ', icon: Package },
];

export function TenantTenancyPage() {
    const { user } = useAuth();
    const [tab, setTab] = useState<Tab>('rooms');
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [rooms, setRooms] = useState<Contract[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
    const [services, setServices] = useState<RoomServiceItem[]>([]);
    const [servicesLoading, setServicesLoading] = useState(false);
    const [confirming, setConfirming] = useState<Contract | null>(null);
    const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [allContracts, activeRooms] = await Promise.all([listMyContracts(), listMyRooms()]);
            setContracts(allContracts);
            setRooms(activeRooms);
            const invoiceLists = await Promise.all(activeRooms.map((c) => listContractInvoices(c.id)));
            setInvoices(invoiceLists.flat());
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const activeContract = useMemo(
        () => rooms[0] ?? contracts.find((c) => c.status === 'PENDING_TENANT') ?? null,
        [rooms, contracts],
    );

    useEffect(() => {
        if (!activeContract) { setServices([]); return; }
        setSelectedContractId(activeContract.id);
        setServicesLoading(true);
        listContractServices(activeContract.id)
            .then(setServices)
            .catch(() => setServices([]))
            .finally(() => setServicesLoading(false));
    }, [activeContract]);

    const pendingTenantContracts = contracts.filter((c) => c.status === 'PENDING_TENANT');
    const unpaidInvoices = invoices.filter((i) => i.status === 'ISSUED' || i.status === 'OVERDUE');
    const outstanding = unpaidInvoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);

    const toggleService = async (service: RoomServiceItem) => {
        if (!activeContract) return;
        const next = !service.subscribed;
        setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, subscribed: next } : s)));
        try {
            await setServiceSubscription(activeContract.id, service.id, next);
        } catch (e) {
            setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, subscribed: service.subscribed } : s)));
            setError((e as Error).message);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Quản lý trọ</p>
                        <h1 className="mt-1 font-heading text-2xl font-bold text-foreground sm:text-3xl">Phòng của tôi</h1>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            Xem phòng đang thuê, hợp đồng, hoá đơn hằng tháng và đăng ký dịch vụ. Phòng chỉ mở sau khi cả bạn và chủ trọ xác nhận hợp đồng.
                        </p>
                    </div>
                    <Link to="/rooms" className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">
                        Tìm phòng khác
                    </Link>
                </div>

                {error && <div className="mb-4"><ErrorBanner message={error} onRetry={() => void load()} /></div>}

                <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatTile label="Phòng đang thuê" value={String(rooms.length)} icon={<Home className="h-5 w-5" />} tone="success" />
                    <StatTile label="Cần bạn xác nhận" value={String(pendingTenantContracts.length)} hint="Hợp đồng đang chờ" icon={<FileSignature className="h-5 w-5" />} tone={pendingTenantContracts.length ? 'warning' : 'default'} />
                    <StatTile label="Hoá đơn chưa thanh toán" value={String(unpaidInvoices.length)} icon={<CreditCard className="h-5 w-5" />} tone={unpaidInvoices.length ? 'warning' : 'default'} />
                    <StatTile label="Còn phải thanh toán" value={`${new Intl.NumberFormat('vi-VN').format(outstanding)} ₫`} icon={<ClipboardList className="h-5 w-5" />} tone={outstanding > 0 ? 'info' : 'default'} />
                </div>

                <div className="mb-5 flex flex-wrap gap-2 border-b border-border pb-3">
                    {TABS.map((t) => (
                        <button key={t.id} type="button" onClick={() => setTab(t.id)}
                            className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${tab === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-foreground hover:bg-muted/70'}`}>
                            <t.icon className="h-4 w-4" /> {t.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Đang tải dữ liệu…</div>
                ) : (
                    <>
                        {tab === 'rooms' && (
                            <RoomsTab rooms={rooms} pending={pendingTenantContracts} onReview={setConfirming} onOpenContracts={() => setTab('contracts')} />
                        )}
                        {tab === 'contracts' && (
                            <ContractsTab contracts={contracts} onReview={setConfirming} />
                        )}
                        {tab === 'invoices' && (
                            <div className="space-y-3">
                                {invoices.length === 0 ? (
                                    <SectionCard>
                                        <EmptyState icon={<CreditCard className="h-6 w-6" />} title="Chưa có hoá đơn" description="Hoá đơn sẽ xuất hiện khi chủ trọ lập cho tháng thuê đầu tiên." />
                                    </SectionCard>
                                ) : invoices.map((inv) => (
                                    <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-heading text-sm font-semibold text-foreground">Tháng {inv.billingMonth}/{inv.billingYear}</p>
                                                <InvoiceStatusBadge status={inv.status} />
                                            </div>
                                            <p className="mt-0.5 text-xs text-muted-foreground">{inv.invoiceCode} · Hạn {formatDate(inv.dueDate)} · {inv.roomName ?? 'Phòng'}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-heading text-base font-bold text-foreground"><Money value={inv.totalAmount} /></span>
                                            {(inv.status === 'ISSUED' || inv.status === 'OVERDUE') && (
                                                <button type="button" onClick={() => setPayingInvoice(inv)} className="rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover">
                                                    Thanh toán
                                                </button>
                                            )}
                                            {inv.status === 'TENANT_CONFIRMED' && (
                                                <button type="button" onClick={() => setPayingInvoice(inv)} className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold hover:bg-muted">
                                                    Xem chi tiết
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {tab === 'services' && (
                            <ServicesTab
                                contract={activeContract}
                                services={services}
                                loading={servicesLoading}
                                onToggle={toggleService}
                            />
                        )}
                    </>
                )}
            </main>

            {confirming && (
                <TenantConfirmModal contract={confirming} onClose={() => setConfirming(null)} onDone={() => { setConfirming(null); void load(); }} />
            )}
            {payingInvoice && (
                <InvoiceActionModal invoice={payingInvoice} mode="tenant" onClose={() => setPayingInvoice(null)} onDone={() => { setPayingInvoice(null); void load(); }} />
            )}
            {!user && (
                <div className="mx-auto max-w-6xl px-4 pb-8">
                    <ErrorBanner message="Bạn cần đăng nhập để xem phòng của mình." />
                </div>
            )}
        </div>
    );
}

function RoomsTab({ rooms, pending, onReview, onOpenContracts }: {
    rooms: Contract[];
    pending: Contract[];
    onReview: (c: Contract) => void;
    onOpenContracts: () => void;
}) {
    if (rooms.length === 0 && pending.length === 0) {
        return (
            <SectionCard>
                <EmptyState
                    icon={<Home className="h-6 w-6" />}
                    title="Bạn chưa thuê phòng nào"
                    description="Khi chủ trọ lập hợp đồng và cả hai bên xác nhận, phòng sẽ xuất hiện tại đây."
                    action={<Link to="/rooms" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Tìm phòng ngay</Link>}
                />
            </SectionCard>
        );
    }
    return (
        <div className="space-y-4">
            {pending.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/20 text-amber-700"><FileSignature className="h-5 w-5" /></span>
                        <div>
                            <p className="font-heading text-sm font-semibold text-foreground">Hợp đồng mới cần bạn xác nhận</p>
                            <p className="text-xs text-muted-foreground">{c.roomLabel ?? c.roomName} · {c.landlordName} · từ {formatDate(c.startDate)}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={onOpenContracts} className="rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">Xem hợp đồng</button>
                        <button type="button" onClick={() => onReview(c)} className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700">Xác nhận ngay</button>
                    </div>
                </div>
            ))}
            {rooms.map((c) => (
                <SectionCard key={c.id} className="overflow-hidden">
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="h-36 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-32 sm:w-48">
                            {c.roomImageUrl
                                ? <img src={c.roomImageUrl} alt={c.roomName ?? 'Phòng'} className="h-full w-full object-cover" loading="lazy" />
                                : <div className="grid h-full place-items-center text-muted-foreground"><Building2 className="h-8 w-8" /></div>}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <h3 className="font-heading text-lg font-bold text-foreground">{c.roomLabel ?? c.roomName ?? 'Phòng'}</h3>
                                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="h-3.5 w-3.5" /> {[c.address, c.district, c.city].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ'}
                                    </p>
                                </div>
                                <ContractStatusBadge status={c.status} />
                            </div>
                            <div className="mt-3 grid gap-x-6 sm:grid-cols-2">
                                <InfoRow label="Giá thuê"><Money value={c.monthlyRent} /></InfoRow>
                                <InfoRow label="Tiền cọc"><Money value={c.depositAmount} /></InfoRow>
                                <InfoRow label="Bắt đầu">{formatDate(c.startDate)}</InfoRow>
                                <InfoRow label="Kết thúc">{c.endDate ? formatDate(c.endDate) : 'Không thời hạn'}</InfoRow>
                                <InfoRow label="Chủ trọ">{c.landlordName}</InfoRow>
                                <InfoRow label="Liên hệ">{c.landlordPhone ?? c.landlordEmail ?? '—'}</InfoRow>
                            </div>
                            {Number(c.outstandingAmount) > 0 && (
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                    <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />{c.unpaidInvoiceCount} hoá đơn chưa thanh toán</span>
                                    <strong><Money value={c.outstandingAmount} /></strong>
                                </div>
                            )}
                            {c.daysUntilEnd !== null && c.daysUntilEnd <= 30 && c.daysUntilEnd >= 0 && (
                                <p className="mt-2 text-xs text-muted-foreground">Hợp đồng còn {c.daysUntilEnd} ngày. Liên hệ chủ trọ nếu muốn gia hạn.</p>
                            )}
                        </div>
                    </div>
                </SectionCard>
            ))}
        </div>
    );
}

function ContractsTab({ contracts, onReview }: { contracts: Contract[]; onReview: (c: Contract) => void }) {
    if (contracts.length === 0) {
        return <SectionCard><EmptyState icon={<ScrollText className="h-6 w-6" />} title="Chưa có hợp đồng" description="Hợp đồng do chủ trọ lập và gửi cho bạn sẽ hiển thị ở đây." /></SectionCard>;
    }
    return (
        <div className="space-y-3">
            {contracts.map((c) => (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <p className="font-heading text-sm font-semibold text-foreground">{c.contractCode}</p>
                            <p className="text-xs text-muted-foreground">{c.roomLabel ?? c.roomName} · {c.landlordName}</p>
                        </div>
                        <ContractStatusBadge status={c.status} />
                    </div>
                    <div className="mt-3 grid gap-x-6 sm:grid-cols-2">
                        <InfoRow label="Thời hạn">{formatDate(c.startDate)} → {c.endDate ? formatDate(c.endDate) : 'không thời hạn'}</InfoRow>
                        <InfoRow label="Giá thuê"><Money value={c.monthlyRent} /></InfoRow>
                        <InfoRow label="Cọc"><Money value={c.depositAmount} />{c.depositPaid ? ' · đã nhận' : ''}</InfoRow>
                        <InfoRow label="Kỳ thanh toán">{c.paymentCycleMonths} tháng · ngày {c.billingDay}</InfoRow>
                        {c.tenantConfirmedAt && <InfoRow label="Bạn xác nhận">{formatDateTime(c.tenantConfirmedAt)}</InfoRow>}
                        {c.landlordConfirmedAt && <InfoRow label="Chủ trọ xác nhận">{formatDateTime(c.landlordConfirmedAt)}</InfoRow>}
                    </div>
                    {c.tenantNote && <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">Ghi chú: {c.tenantNote}</p>}
                    {c.endReason && <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">Kết thúc: {c.endReason}</p>}
                    {c.status === 'PENDING_TENANT' && (
                        <div className="mt-3 flex justify-end">
                            <button type="button" onClick={() => onReview(c)} className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover">
                                Xem & xác nhận
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function ServicesTab({ contract, services, loading, onToggle }: {
    contract: Contract | null;
    services: RoomServiceItem[];
    loading: boolean;
    onToggle: (s: RoomServiceItem) => void;
}) {
    if (!contract) {
        return <SectionCard><EmptyState icon={<Sparkles className="h-6 w-6" />} title="Chưa có hợp đồng đang hiệu lực" description="Bạn cần có phòng đang thuê để đăng ký dịch vụ." /></SectionCard>;
    }
    if (loading) {
        return <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Đang tải dịch vụ…</div>;
    }
    if (services.length === 0) {
        return <SectionCard><EmptyState icon={<Package className="h-6 w-6" />} title="Phòng chưa khai báo dịch vụ" description="Chủ trọ chưa thiết lập dịch vụ cho phòng này." /></SectionCard>;
    }
    return (
        <SectionCard title="Dịch vụ của phòng" description={`${contract.roomLabel ?? contract.roomName} · đăng ký dịch vụ bạn muốn dùng. Phí dịch vụ sẽ được tính vào hoá đơn tháng.`}>
            <ul className="divide-y divide-border">
                {services.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                            <p className="font-medium text-foreground">{s.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {s.unitPrice === null ? 'Đơn giá chưa xác định' : <><Money value={s.unitPrice} />{s.unit ? ` / ${s.unit}` : ''}</>}
                                {s.description ? ` · ${s.description}` : ''}
                            </p>
                        </div>
                        <button type="button" onClick={() => onToggle(s)}
                            className={`min-h-9 rounded-xl px-4 py-1.5 text-xs font-semibold transition-colors ${s.subscribed ? 'bg-primary text-primary-foreground hover:bg-primary-hover' : 'border border-border text-foreground hover:bg-muted'}`}>
                            {s.subscribed ? 'Đang đăng ký' : 'Đăng ký'}
                        </button>
                    </li>
                ))}
            </ul>
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                <User className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Đăng ký có hiệu lực từ kỳ hoá đơn tiếp theo. Liên hệ chủ trọ nếu cần điều chỉnh đơn giá.
            </p>
        </SectionCard>
    );
}
