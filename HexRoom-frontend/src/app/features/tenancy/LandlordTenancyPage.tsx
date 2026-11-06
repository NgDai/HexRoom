import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Building2, CalendarClock, CheckCircle2, ClipboardList, CreditCard, FileSignature,
    Loader2, Plus, Search, UserCheck, Wallet,
} from 'lucide-react';
import { Header } from '@/app/features/home/components/Header';
import {
    listLandlordContracts, listLandlordInvoices, listRoomServices,
    createContract, createRoomService, updateRoomService, deleteRoomService, searchTenants,
    type Contract, type Invoice, type RoomServiceItem, type TenantLookup,
} from '@/lib/tenancy-api';
import { listManageableRooms } from '@/lib/tenancy-api';
import {
    ContractStatusBadge, EmptyState, ErrorBanner, InfoRow, InvoiceStatusBadge, Money,
    SectionCard, StatTile, formatDate, formatDateTime, CARD_CLASS,
} from './components/TenancyUI';
import { LandlordConfirmModal, EndContractModal } from './components/ContractModals';
import { CreateInvoiceModal } from './components/CreateInvoiceModal';
import { InvoiceActionModal } from './components/InvoiceModals';

type Tab = 'overview' | 'contracts' | 'invoices' | 'services';

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
    { id: 'overview', label: 'Tổng quan', icon: Building2 },
    { id: 'contracts', label: 'Hợp đồng', icon: FileSignature },
    { id: 'invoices', label: 'Hoá đơn', icon: CreditCard },
    { id: 'services', label: 'Dịch vụ phòng', icon: ClipboardList },
];

export function LandlordTenancyPage() {
    const [tab, setTab] = useState<Tab>('overview');
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirming, setConfirming] = useState<Contract | null>(null);
    const [ending, setEnding] = useState<Contract | null>(null);
    const [invoicing, setInvoicing] = useState<Contract | null>(null);
    const [invoiceAction, setInvoiceAction] = useState<Invoice | null>(null);
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [cs, inv] = await Promise.all([listLandlordContracts(), listLandlordInvoices()]);
            setContracts(cs);
            setInvoices(inv);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const stats = useMemo(() => {
        const active = contracts.filter((c) => c.status === 'ACTIVE');
        const waitingTenant = contracts.filter((c) => c.status === 'PENDING_TENANT');
        const waitingMe = contracts.filter((c) => c.status === 'PENDING_LANDLORD');
        const due = invoices.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED');
        const collected = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + Number(i.totalAmount || 0), 0);
        const pending = due.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
        return { active, waitingTenant, waitingMe, due, collected, pending };
    }, [contracts, invoices]);

    const activeContracts = stats.active;

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Quản lý trọ</p>
                        <h1 className="mt-1 font-heading text-2xl font-bold text-foreground sm:text-3xl">Quản lý người thuê</h1>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            Lập hợp đồng, xác nhận hai chiều, lập hoá đơn hằng tháng và theo dõi dịch vụ của từng phòng.
                        </p>
                    </div>
                    <button type="button" onClick={() => setCreating(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
                        <Plus className="h-4 w-4" /> Thêm người thuê
                    </button>
                </div>

                {error && <div className="mb-4"><ErrorBanner message={error} onRetry={() => void load()} /></div>}

                <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatTile label="Hợp đồng hiệu lực" value={String(stats.active.length)} icon={<UserCheck className="h-5 w-5" />} tone="success" />
                    <StatTile label="Chờ bạn xác nhận" value={String(stats.waitingMe.length)} hint="Người thuê đã đồng ý" icon={<FileSignature className="h-5 w-5" />} tone={stats.waitingMe.length ? 'warning' : 'default'} />
                    <StatTile label="Chờ người thuê" value={String(stats.waitingTenant.length)} icon={<CalendarClock className="h-5 w-5" />} tone="info" />
                    <StatTile label="Chưa thu" value={`${new Intl.NumberFormat('vi-VN').format(stats.pending)} ₫`} hint={`${stats.due.length} hoá đơn`} icon={<Wallet className="h-5 w-5" />} tone={stats.pending ? 'warning' : 'default'} />
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
                        {tab === 'overview' && <OverviewTab contracts={contracts} invoices={invoices} onConfirm={setConfirming} onCreateInvoice={setInvoicing} onOpenInvoice={setInvoiceAction} />}
                        {tab === 'contracts' && <LandlordContractsTab contracts={contracts} onConfirm={setConfirming} onEnd={setEnding} onCreateInvoice={setInvoicing} />}
                        {tab === 'invoices' && <LandlordInvoicesTab invoices={invoices} onOpen={setInvoiceAction} contracts={activeContracts} onCreate={setInvoicing} />}
                        {tab === 'services' && <LandlordServicesTab contracts={contracts} />}
                    </>
                )}
            </main>

            {confirming && <LandlordConfirmModal contract={confirming} onClose={() => setConfirming(null)} onDone={() => { setConfirming(null); void load(); }} />}
            {ending && <EndContractModal contract={ending} onClose={() => setEnding(null)} onDone={() => { setEnding(null); void load(); }} />}
            {invoicing && <CreateInvoiceModal contract={invoicing} onClose={() => setInvoicing(null)} onDone={() => { setInvoicing(null); void load(); }} />}
            {invoiceAction && <InvoiceActionModal invoice={invoiceAction} mode="landlord" onClose={() => setInvoiceAction(null)} onDone={() => { setInvoiceAction(null); void load(); }} />}
            {creating && <CreateContractModal onClose={() => setCreating(false)} onDone={() => { setCreating(false); void load(); }} />}
        </div>
    );
}

function OverviewTab({ contracts, invoices, onConfirm, onCreateInvoice, onOpenInvoice }: {
    contracts: Contract[];
    invoices: Invoice[];
    onConfirm: (c: Contract) => void;
    onCreateInvoice: (c: Contract) => void;
    onOpenInvoice: (i: Invoice) => void;
}) {
    const waiting = contracts.filter((c) => c.status === 'PENDING_LANDLORD');
    const active = contracts.filter((c) => c.status === 'ACTIVE');
    const unpaid = invoices.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED');

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Cần bạn xác nhận" description="Người thuê đã đồng ý, chờ bạn kích hoạt hợp đồng.">
                {waiting.length === 0 ? (
                    <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="Không có việc cần xử lý" description="Mọi hợp đồng đã được xử lý." />
                ) : (
                    <ul className="space-y-2">
                        {waiting.map((c) => (
                            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">{c.tenantName}</p>
                                    <p className="text-xs text-muted-foreground">{c.roomLabel ?? c.roomName} · {formatDate(c.startDate)}</p>
                                </div>
                                <button type="button" onClick={() => onConfirm(c)} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                                    Kích hoạt
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </SectionCard>

            <SectionCard title="Hoá đơn chưa thu" description="Hoá đơn chưa được xác nhận thanh toán.">
                {unpaid.length === 0 ? (
                    <EmptyState icon={<Wallet className="h-6 w-6" />} title="Đã thu đủ" description="Không có hoá đơn nào đang chờ thanh toán." />
                ) : (
                    <ul className="space-y-2">
                        {unpaid.slice(0, 6).map((i) => (
                            <li key={i.id}>
                                <button type="button" onClick={() => onOpenInvoice(i)} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-left hover:border-primary/40 hover:bg-primary/5">
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-medium text-foreground">{i.tenantName} · T{i.billingMonth}/{i.billingYear}</span>
                                        <span className="block text-xs text-muted-foreground">{i.invoiceCode}</span>
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <InvoiceStatusBadge status={i.status} />
                                        <span className="font-semibold"><Money value={i.totalAmount} /></span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </SectionCard>

            <SectionCard title="Phòng đang cho thuê" description="Lập hoá đơn nhanh cho từng phòng." className="lg:col-span-2">
                {active.length === 0 ? (
                    <EmptyState icon={<Building2 className="h-6 w-6" />} title="Chưa có phòng đang cho thuê" description="Kích hoạt hợp đồng để bắt đầu quản lý." />
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {active.map((c) => (
                            <div key={c.id} className={`${CARD_CLASS} flex flex-wrap items-center justify-between gap-3 p-4`}>
                                <div className="min-w-0">
                                    <p className="truncate font-heading text-sm font-semibold text-foreground">{c.roomLabel ?? c.roomName}</p>
                                    <p className="text-xs text-muted-foreground">{c.tenantName} · <Money value={c.monthlyRent} />/tháng</p>
                                    {Number(c.outstandingAmount) > 0 && <p className="mt-1 text-[11px] font-medium text-amber-700">Còn nợ <Money value={c.outstandingAmount} /></p>}
                                </div>
                                <button type="button" onClick={() => onCreateInvoice(c)} className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">
                                    Lập hoá đơn
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>
        </div>
    );
}

function LandlordContractsTab({ contracts, onConfirm, onEnd, onCreateInvoice }: {
    contracts: Contract[];
    onConfirm: (c: Contract) => void;
    onEnd: (c: Contract) => void;
    onCreateInvoice: (c: Contract) => void;
}) {
    if (contracts.length === 0) {
        return <SectionCard><EmptyState icon={<FileSignature className="h-6 w-6" />} title="Chưa có hợp đồng" description="Bấm “Thêm người thuê” để lập hợp đồng đầu tiên." /></SectionCard>;
    }
    return (
        <div className="space-y-3">
            {contracts.map((c) => (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="font-heading text-sm font-semibold text-foreground">{c.contractCode}</p>
                            <p className="text-xs text-muted-foreground">{c.tenantName} · {c.roomLabel ?? c.roomName}</p>
                        </div>
                        <ContractStatusBadge status={c.status} />
                    </div>
                    <div className="mt-3 grid gap-x-6 sm:grid-cols-2">
                        <InfoRow label="Thời hạn">{formatDate(c.startDate)} → {c.endDate ? formatDate(c.endDate) : 'không thời hạn'}</InfoRow>
                        <InfoRow label="Giá thuê"><Money value={c.monthlyRent} /></InfoRow>
                        <InfoRow label="Cọc"><Money value={c.depositAmount} />{c.depositPaid ? ' · đã nhận' : ''}</InfoRow>
                        <InfoRow label="Liên hệ">{c.tenantPhone ?? c.tenantEmail ?? '—'}</InfoRow>
                        <InfoRow label="Người thuê xác nhận">{c.tenantConfirmedAt ? formatDateTime(c.tenantConfirmedAt) : '—'}</InfoRow>
                        <InfoRow label="Bạn xác nhận">{c.landlordConfirmedAt ? formatDateTime(c.landlordConfirmedAt) : '—'}</InfoRow>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                        {c.status === 'PENDING_LANDLORD' && (
                            <button type="button" onClick={() => onConfirm(c)} className="rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover">Kích hoạt</button>
                        )}
                        {c.status === 'ACTIVE' && (
                            <>
                                <button type="button" onClick={() => onCreateInvoice(c)} className="rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20">Lập hoá đơn</button>
                                <button type="button" onClick={() => onEnd(c)} className="rounded-xl border border-rose-300 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">Kết thúc</button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function LandlordInvoicesTab({ invoices, onOpen, contracts, onCreate }: {
    invoices: Invoice[];
    onOpen: (i: Invoice) => void;
    contracts: Contract[];
    onCreate: (c: Contract) => void;
}) {
    if (invoices.length === 0) {
        return (
            <SectionCard>
                <EmptyState icon={<CreditCard className="h-6 w-6" />} title="Chưa có hoá đơn"
                    description="Lập hoá đơn đầu tiên cho một hợp đồng đang hiệu lực."
                    action={contracts.length > 0 ? (
                        <button type="button" onClick={() => onCreate(contracts[0])} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Lập hoá đơn</button>
                    ) : undefined} />
            </SectionCard>
        );
    }
    return (
        <div className="space-y-2">
            {invoices.map((i) => (
                <button key={i.id} type="button" onClick={() => onOpen(i)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5">
                    <div className="min-w-0">
                        <p className="font-heading text-sm font-semibold text-foreground">{i.tenantName} · Tháng {i.billingMonth}/{i.billingYear}</p>
                        <p className="text-xs text-muted-foreground">{i.invoiceCode} · {i.roomName ?? ''} · Hạn {formatDate(i.dueDate)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <InvoiceStatusBadge status={i.status} />
                        <span className="font-heading text-base font-bold"><Money value={i.totalAmount} /></span>
                    </div>
                </button>
            ))}
        </div>
    );
}

function LandlordServicesTab({ contracts }: { contracts: Contract[] }) {
    const rooms = useMemo(() => {
        const map = new Map<string, { roomId: string; label: string }>();
        contracts.forEach((c) => {
            if (c.roomId && !map.has(c.roomId)) map.set(c.roomId, { roomId: c.roomId, label: c.roomLabel ?? c.roomName ?? 'Phòng' });
        });
        return Array.from(map.values());
    }, [contracts]);
    const [roomId, setRoomId] = useState<string>('');
    const [services, setServices] = useState<RoomServiceItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [price, setPrice] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!roomId && rooms.length > 0) setRoomId(rooms[0].roomId);
    }, [rooms, roomId]);

    const reload = useCallback(async () => {
        if (!roomId) return;
        setLoading(true);
        try {
            setServices(await listRoomServices(roomId));
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [roomId]);

    useEffect(() => { void reload(); }, [reload]);

    const add = async () => {
        if (!name.trim()) { setError('Nhập tên dịch vụ'); return; }
        try {
            await createRoomService(roomId, {
                name: name.trim(),
                unitPrice: price ? Number(price) : undefined,
                unit: unit.trim() || undefined,
            });
            setName(''); setUnit(''); setPrice(''); setError(null);
            await reload();
        } catch (e) {
            setError((e as Error).message);
        }
    };

    const toggle = async (s: RoomServiceItem) => {
        try {
            await updateRoomService(s.id, { name: s.name, unitPrice: s.unitPrice ?? undefined, unit: s.unit ?? undefined, description: s.description ?? undefined, active: !s.active });
            await reload();
        } catch (e) {
            setError((e as Error).message);
        }
    };

    const remove = async (s: RoomServiceItem) => {
        try {
            await deleteRoomService(s.id);
            await reload();
        } catch (e) {
            setError((e as Error).message);
        }
    };

    if (rooms.length === 0) {
        return <SectionCard><EmptyState icon={<ClipboardList className="h-6 w-6" />} title="Chưa có phòng nào" description="Chỉ phòng đã có hợp đồng mới cần khai báo dịch vụ." /></SectionCard>;
    }

    return (
        <div className="space-y-4">
            <SectionCard title="Chọn phòng" description="Khai báo dịch vụ cho từng phòng; người thuê sẽ thấy và đăng ký các dịch vụ này.">
                <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm sm:max-w-sm">
                    {rooms.map((r) => <option key={r.roomId} value={r.roomId}>{r.label}</option>)}
                </select>
            </SectionCard>

            <SectionCard title="Dịch vụ hiện có">
                {error && <p className="mb-2 text-sm text-rose-600">{error}</p>}
                {loading ? (
                    <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : services.length === 0 ? (
                    <p className="py-4 text-sm text-muted-foreground">Chưa có dịch vụ nào cho phòng này.</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {services.map((s) => (
                            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                                <div className="min-w-0">
                                    <p className={`font-medium ${s.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{s.name}</p>
                                    <p className="text-xs text-muted-foreground">{s.unitPrice === null ? 'Chưa xác định đơn giá' : <><Money value={s.unitPrice} />{s.unit ? ` / ${s.unit}` : ''}</>}</p>
                                </div>
                                <div className="flex gap-1.5">
                                    <button type="button" onClick={() => toggle(s)} className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted">{s.active ? 'Ngừng bán' : 'Bật lại'}</button>
                                    <button type="button" onClick={() => remove(s)} className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">Xoá</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </SectionCard>

            <SectionCard title="Thêm dịch vụ">
                <div className="grid gap-3 sm:grid-cols-[1fr_120px_160px_auto]">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên dịch vụ (VD: Điện)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" aria-label="Tên dịch vụ" />
                    <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Đơn vị (kWh)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" aria-label="Đơn vị" />
                    <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={0} placeholder="Đơn giá (₫)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" aria-label="Đơn giá" />
                    <button type="button" onClick={add} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
                        <Plus className="h-4 w-4" /> Thêm
                    </button>
                </div>
            </SectionCard>
        </div>
    );
}

/** Modal lập hợp đồng: tìm người thuê đã có tài khoản, chọn phòng và điều khoản. */
function CreateContractModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<TenantLookup[]>([]);
    const [searching, setSearching] = useState(false);
    const [tenant, setTenant] = useState<TenantLookup | null>(null);
    const [rooms, setRooms] = useState<{ id: string; label: string; price: number }[]>([]);
    const [roomsLoading, setRoomsLoading] = useState(true);
    const [roomId, setRoomId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [rent, setRent] = useState('');
    const [deposit, setDeposit] = useState('');
    const [billingDay, setBillingDay] = useState('5');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await listManageableRooms();
                if (!cancelled) {
                    setRooms(list.map((r) => ({ id: r.id, label: r.label, price: r.price })));
                }
            } catch {
                if (!cancelled) setRooms([]);
            } finally {
                if (!cancelled) setRoomsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const room = rooms.find((r) => r.id === roomId);
        if (room && !rent) setRent(String(room.price || ''));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);

    const doSearch = async () => {
        if (query.trim().length < 2) { setError('Nhập ít nhất 2 ký tự (email hoặc số điện thoại)'); return; }
        setSearching(true); setError(null);
        try {
            const found = await searchTenants(query.trim());
            setResults(found);
            if (found.length === 0) setError('Không tìm thấy tài khoản người thuê phù hợp.');
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSearching(false);
        }
    };

    const submit = async () => {
        if (!tenant || !roomId || !startDate || !rent) {
            setError('Vui lòng chọn người thuê, phòng, ngày bắt đầu và giá thuê.');
            return;
        }
        setBusy(true); setError(null);
        try {
            await createContract({
                roomId,
                tenantId: tenant.id,
                startDate,
                endDate: endDate || undefined,
                monthlyRent: Number(rent),
                depositAmount: deposit ? Number(deposit) : 0,
                billingDay: Number(billingDay),
            });
            onDone();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-xl overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-2xl">
                <header className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div>
                        <h3 className="font-heading text-base font-semibold text-foreground">Thêm người thuê</h3>
                        <p className="text-xs text-muted-foreground">Lập hợp đồng gửi người thuê xác nhận</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted">Đóng</button>
                </header>
                <div className="max-h-[62vh] space-y-3 overflow-y-auto px-5 py-4">
                    {!tenant ? (
                        <>
                            <div className="flex gap-2">
                                <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void doSearch()}
                                    placeholder="Email hoặc số điện thoại" className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" aria-label="Tìm người thuê" />
                                <button type="button" onClick={() => void doSearch()} disabled={searching}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                                    <Search className="h-4 w-4" /> {searching ? 'Đang tìm' : 'Tìm'}
                                </button>
                            </div>
                            {error && <p className="text-sm text-rose-600">{error}</p>}
                            <ul className="space-y-2">
                                {results.map((t) => (
                                    <li key={t.id}>
                                        <button type="button" onClick={() => { setTenant(t); setError(null); }}
                                            className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:border-primary/40 hover:bg-primary/5">
                                            {t.avatarUrl
                                                ? <img src={t.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                                                : <span className="grid h-10 w-10 place-items-center rounded-full bg-muted font-semibold text-muted-foreground">{t.fullName.charAt(0)}</span>}
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-medium text-foreground">{t.fullName}</span>
                                                <span className="block truncate text-xs text-muted-foreground">{t.email}{t.phone ? ` · ${t.phone}` : ''}</span>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3">
                                <div className="flex items-center gap-3">
                                    <UserCheck className="h-5 w-5 text-primary" />
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{tenant.fullName}</p>
                                        <p className="text-xs text-muted-foreground">{tenant.email}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setTenant(null)} className="text-xs font-medium text-primary hover:underline">Đổi</button>
                            </div>

                            <label className="block">
                                <span className="mb-1 block text-xs font-medium">Phòng</span>
                                <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
                                    <option value="">{roomsLoading ? 'Đang tải…' : '— Chọn phòng —'}</option>
                                    {rooms.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                                </select>
                                {!roomsLoading && rooms.length === 0 && <span className="mt-1 block text-xs text-muted-foreground">Bạn chưa có phòng trống để cho thuê.</span>}
                            </label>

                            <div className="grid grid-cols-2 gap-3">
                                <label className="block">
                                    <span className="mb-1 block text-xs font-medium">Ngày bắt đầu</span>
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-xs font-medium">Ngày kết thúc (tuỳ chọn)</span>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-xs font-medium">Giá thuê (₫/tháng)</span>
                                    <input type="number" min={0} value={rent} onChange={(e) => setRent(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-xs font-medium">Tiền cọc (₫)</span>
                                    <input type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-xs font-medium">Ngày thanh toán hằng tháng</span>
                                    <input type="number" min={1} max={28} value={billingDay} onChange={(e) => setBillingDay(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                                </label>
                            </div>
                            <p className="rounded-xl bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                                Hợp đồng bắt đầu ở trạng thái chờ người thuê xác nhận. Phòng chỉ mở sau khi cả hai bên xác nhận và ghi nhận tiền cọc.
                            </p>
                            {error && <p className="text-sm text-rose-600">{error}</p>}
                        </>
                    )}
                </div>
                <footer className="flex justify-end gap-2 border-t border-border px-5 py-3">
                    <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Huỷ</button>
                    {tenant && (
                        <button type="button" onClick={submit} disabled={busy} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                            {busy ? 'Đang gửi…' : 'Gửi hợp đồng'}
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}
