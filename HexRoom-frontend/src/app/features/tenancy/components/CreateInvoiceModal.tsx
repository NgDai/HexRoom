import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
    createInvoice,
    listContractServices,
    type Contract,
    type Invoice,
    type RoomServiceItem,
} from '@/lib/tenancy-api';
import { Money } from './TenancyUI';

/** Chủ trọ lập hoá đơn tháng cho một hợp đồng đang hiệu lực. */
export function CreateInvoiceModal({ contract, onClose, onDone }: {
    contract: Contract;
    onClose: () => void;
    onDone: (invoice: Invoice) => void;
}) {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [dueDate, setDueDate] = useState('');
    const [otherAmount, setOtherAmount] = useState('');
    const [note, setNote] = useState('');
    const [services, setServices] = useState<RoomServiceItem[]>([]);
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [quantities, setQuantities] = useState<Record<string, string>>({});
    const [prices, setPrices] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        listContractServices(contract.id)
            .then((list) => {
                setServices(list);
                // Mặc định chọn sẵn các dịch vụ người thuê đã đăng ký.
                const pre: Record<string, boolean> = {};
                list.forEach((s) => { if (s.subscribed) pre[s.id] = true; });
                setSelected(pre);
            })
            .catch(() => setServices([]));
    }, [contract.id]);

    const serviceTotal = useMemo(() => {
        return services.reduce((sum, s) => {
            if (!selected[s.id]) return sum;
            const qty = Number(quantities[s.id] || 1);
            const price = Number(prices[s.id] ?? s.unitPrice ?? 0);
            return sum + qty * price;
        }, 0);
    }, [services, selected, quantities, prices]);

    const total = Number(contract.monthlyRent || 0) + serviceTotal + Number(otherAmount || 0);

    const submit = async () => {
        setBusy(true);
        setError(null);
        const items = services.filter((s) => selected[s.id]).map((s) => ({
            serviceId: s.id,
            quantity: Number(quantities[s.id] || 1),
            unitPrice: Number(prices[s.id] ?? s.unitPrice ?? 0),
        }));
        try {
            const created = await createInvoice(contract.id, {
                billingMonth: month,
                billingYear: year,
                dueDate: dueDate || undefined,
                note: note.trim() || undefined,
                otherAmount: otherAmount ? Number(otherAmount) : undefined,
                items,
            });
            onDone(created);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-2xl overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-2xl">
                <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                    <div>
                        <h3 className="font-heading text-base font-semibold text-foreground">Lập hoá đơn tháng</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">{contract.tenantName} · {contract.roomLabel ?? contract.roomName}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
                </header>

                <div className="max-h-[62vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium">Tháng</span>
                            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>Tháng {m}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium">Năm</span>
                            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium">Hạn thanh toán</span>
                            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium">Phát sinh khác (₫)</span>
                            <input type="number" min={0} value={otherAmount} onChange={(e) => setOtherAmount(e.target.value)} placeholder="0" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                        </label>
                    </div>

                    <div className="rounded-xl border border-border">
                        <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
                            <span>Tiền phòng</span>
                            <Money value={Number(contract.monthlyRent)} />
                        </div>
                        {services.length === 0 ? (
                            <p className="px-3 py-4 text-xs text-muted-foreground">Phòng chưa khai báo dịch vụ nào. Bạn có thể lập hoá đơn chỉ với tiền phòng.</p>
                        ) : services.map((s) => (
                            <div key={s.id} className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 last:border-b-0">
                                <input type="checkbox" checked={!!selected[s.id]} onChange={(e) => setSelected((p) => ({ ...p, [s.id]: e.target.checked }))} className="h-4 w-4 accent-[var(--color-primary)]" />
                                <span className="min-w-0 flex-1 truncate">
                                    {s.name}
                                    {s.unit && <span className="ml-1 text-xs text-muted-foreground">/{s.unit}</span>}
                                </span>
                                <input type="number" min={0} step="0.1" value={quantities[s.id] ?? '1'} onChange={(e) => setQuantities((p) => ({ ...p, [s.id]: e.target.value }))}
                                    disabled={!selected[s.id]} aria-label={`Số lượng ${s.name}`}
                                    className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-right text-xs disabled:opacity-40" />
                                <input type="number" min={0} value={prices[s.id] ?? (s.unitPrice ?? '')} onChange={(e) => setPrices((p) => ({ ...p, [s.id]: e.target.value }))}
                                    disabled={!selected[s.id]} aria-label={`Đơn giá ${s.name}`} placeholder="Đơn giá"
                                    className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-right text-xs disabled:opacity-40" />
                            </div>
                        ))}
                    </div>

                    <label className="block">
                        <span className="mb-1 block text-xs font-medium">Ghi chú gửi người thuê</span>
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                    </label>

                    <div className="flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2.5">
                        <span className="text-xs text-muted-foreground">Tổng tiền (tiền phòng + dịch vụ + phát sinh)</span>
                        <span className="font-heading text-lg font-bold text-foreground"><Money value={total} /></span>
                    </div>
                    {error && <p className="text-sm text-rose-600">{error}</p>}
                </div>

                <footer className="flex justify-end gap-2 border-t border-border px-5 py-4">
                    <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Huỷ</button>
                    <button type="button" onClick={submit} disabled={busy} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                        {busy ? 'Đang lập...' : 'Gửi hoá đơn'}
                    </button>
                </footer>
            </div>
        </div>
    );
}
