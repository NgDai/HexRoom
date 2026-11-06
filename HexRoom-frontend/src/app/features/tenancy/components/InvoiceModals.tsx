import { useState } from 'react';
import { X } from 'lucide-react';
import {
    tenantConfirmInvoice,
    landlordConfirmInvoice,
    cancelInvoice,
    type Invoice,
} from '@/lib/tenancy-api';
import { InvoiceStatusBadge, Money, formatDate } from './TenancyUI';

type Mode = 'tenant' | 'landlord';

const PAYMENT_METHODS = [
    { value: 'BANK_TRANSFER', label: 'Chuyển khoản ngân hàng' },
    { value: 'CASH', label: 'Tiền mặt' },
    { value: 'MOMO', label: 'Ví MoMo' },
    { value: 'OTHER', label: 'Khác' },
];

/** Khối chi tiết hoá đơn dùng chung cho cả hai phía. */
export function InvoiceDetail({ invoice }: { invoice: Invoice }) {
    return (
        <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="font-heading text-sm font-semibold text-foreground">Hoá đơn tháng {invoice.billingMonth}/{invoice.billingYear}</p>
                    <p className="text-xs text-muted-foreground">{invoice.invoiceCode} · Hạn {formatDate(invoice.dueDate)}</p>
                </div>
                <InvoiceStatusBadge status={invoice.status} />
            </div>
            <div className="divide-y divide-border rounded-xl border border-border">
                {invoice.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                            <p className="truncate text-foreground">{item.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                                {Number(item.quantity)} {item.unit ?? ''} × <Money value={item.unitPrice} />
                            </p>
                        </div>
                        <span className="shrink-0 font-medium"><Money value={item.amount} /></span>
                    </div>
                ))}
            </div>
            <dl className="space-y-1 rounded-xl bg-muted/60 p-3">
                <div className="flex justify-between text-xs text-muted-foreground"><dt>Tiền phòng</dt><dd><Money value={invoice.roomAmount} /></dd></div>
                <div className="flex justify-between text-xs text-muted-foreground"><dt>Dịch vụ</dt><dd><Money value={invoice.serviceAmount} /></dd></div>
                {Number(invoice.otherAmount) > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground"><dt>Phát sinh khác</dt><dd><Money value={invoice.otherAmount} /></dd></div>
                )}
                <div className="flex justify-between border-t border-border pt-1.5 font-heading text-base font-bold text-foreground">
                    <dt>Tổng cộng</dt><dd><Money value={invoice.totalAmount} /></dd>
                </div>
            </dl>
            {invoice.note && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{invoice.note}</p>}
        </div>
    );
}

export function InvoiceActionModal({ invoice, mode, onClose, onDone }: {
    invoice: Invoice;
    mode: Mode;
    onClose: () => void;
    onDone: (updated: Invoice) => void;
}) {
    const [method, setMethod] = useState('BANK_TRANSFER');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canTenantPay = mode === 'tenant' && (invoice.status === 'ISSUED' || invoice.status === 'OVERDUE');
    const canLandlordConfirm = mode === 'landlord' && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
    const canCancel = mode === 'landlord' && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';

    const run = async (fn: () => Promise<Invoice>) => {
        setBusy(true);
        setError(null);
        try {
            onDone(await fn());
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-2xl">
                <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                    <h3 className="font-heading text-base font-semibold text-foreground">
                        {mode === 'tenant' ? 'Thanh toán hoá đơn' : 'Xử lý hoá đơn'}
                    </h3>
                    <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
                </header>
                <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
                    <InvoiceDetail invoice={invoice} />
                    {canTenantPay && (
                        <div className="space-y-3">
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium">Hình thức thanh toán</span>
                                <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
                                    {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium">Ghi chú (tuỳ chọn)</span>
                                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Mã giao dịch, thời gian chuyển..." className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                            </label>
                            <p className="rounded-xl bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                                HexRoom không giữ tiền. Bạn chuyển khoản trực tiếp cho chủ trọ, sau đó xác nhận tại đây để chủ trọ đối chiếu.
                            </p>
                        </div>
                    )}
                    {mode === 'landlord' && invoice.status === 'ISSUED' && (
                        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Người thuê chưa xác nhận chuyển tiền. Chỉ xác nhận khi bạn đã kiểm tra tài khoản.</p>
                    )}
                    {error && <p className="text-sm text-rose-600">{error}</p>}
                </div>
                <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
                    <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Đóng</button>
                    {canCancel && (
                        <button type="button" disabled={busy} onClick={() => run(() => cancelInvoice(invoice.id, 'Huỷ bởi chủ trọ'))}
                            className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                            Huỷ hoá đơn
                        </button>
                    )}
                    {canTenantPay && (
                        <button type="button" disabled={busy} onClick={() => run(() => tenantConfirmInvoice(invoice.id, method, note.trim() || undefined))}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                            {busy ? 'Đang gửi...' : 'Tôi đã chuyển tiền'}
                        </button>
                    )}
                    {canLandlordConfirm && (
                        <button type="button" disabled={busy} onClick={() => run(() => landlordConfirmInvoice(invoice.id, false))}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                            {busy ? 'Đang xử lý...' : 'Xác nhận đã nhận tiền'}
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}
