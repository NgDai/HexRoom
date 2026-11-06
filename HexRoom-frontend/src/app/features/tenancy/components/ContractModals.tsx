import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
import {
    tenantConfirmContract,
    tenantRejectContract,
    landlordConfirmContract,
    endContract,
    type Contract,
} from '@/lib/tenancy-api';
import { Money, formatDate } from './TenancyUI';

type Props = {
    contract: Contract;
    onClose: () => void;
    onDone: (updated?: Contract) => void;
};

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-2xl">
                <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                    <div>
                        <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
                        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                        <X className="h-5 w-5" />
                    </button>
                </header>
                {children}
            </div>
        </div>
    );
}

/** Người thuê xem điều khoản trước khi xác nhận. */
export function TenantConfirmModal({ contract, onClose, onDone }: Props) {
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            const updated = await tenantConfirmContract(contract.id, note.trim() || undefined);
            onDone(updated);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const reject = async () => {
        if (!note.trim()) {
            setError('Vui lòng ghi rõ lý do từ chối để chủ trọ có thể điều chỉnh.');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            onDone(await tenantRejectContract(contract.id, note.trim()));
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <ModalShell title="Xác nhận hợp đồng thuê" subtitle={`${contract.contractCode} · ${contract.roomLabel ?? contract.roomName}`} onClose={onClose}>
            <div className="max-h-[55vh] space-y-3 overflow-y-auto px-5 py-4 text-sm">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-muted/60 p-4">
                    <dt className="text-muted-foreground">Giá thuê</dt>
                    <dd className="text-right font-semibold"><Money value={contract.monthlyRent} /></dd>
                    <dt className="text-muted-foreground">Tiền cọc</dt>
                    <dd className="text-right font-semibold"><Money value={contract.depositAmount} /></dd>
                    <dt className="text-muted-foreground">Bắt đầu</dt>
                    <dd className="text-right">{formatDate(contract.startDate)}</dd>
                    <dt className="text-muted-foreground">Kết thúc</dt>
                    <dd className="text-right">{contract.endDate ? formatDate(contract.endDate) : 'Không thời hạn'}</dd>
                    <dt className="text-muted-foreground">Kỳ thanh toán</dt>
                    <dd className="text-right">{contract.paymentCycleMonths} tháng · ngày {contract.billingDay}</dd>
                    <dt className="text-muted-foreground">Chủ trọ</dt>
                    <dd className="text-right">{contract.landlordName}</dd>
                </dl>
                {contract.houseRules && (
                    <div>
                        <p className="mb-1 font-medium text-foreground">Nội quy</p>
                        <p className="whitespace-pre-line rounded-xl bg-muted/40 p-3 text-muted-foreground">{contract.houseRules}</p>
                    </div>
                )}
                {contract.extraTerms && (
                    <div>
                        <p className="mb-1 font-medium text-foreground">Điều khoản bổ sung</p>
                        <p className="whitespace-pre-line rounded-xl bg-muted/40 p-3 text-muted-foreground">{contract.extraTerms}</p>
                    </div>
                )}
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-foreground">Ghi chú của bạn (tuỳ chọn)</span>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        placeholder="Ví dụ: cần chuyển vào ngày 01/12 thay vì 05/12"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                </label>
                <p className="rounded-xl bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                    Hợp đồng chỉ có hiệu lực sau khi cả hai bên xác nhận và tiền cọc được ghi nhận.
                </p>
                {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>
            <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
                <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Để sau</button>
                <button type="button" onClick={reject} disabled={busy} className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50">Từ chối</button>
                <button type="button" onClick={submit} disabled={busy} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                    {busy ? 'Đang gửi...' : 'Đồng ý hợp đồng'}
                </button>
            </footer>
        </ModalShell>
    );
}

/** Chủ trọ xác nhận lần cuối, ghi nhận cọc và kích hoạt hợp đồng. */
export function LandlordConfirmModal({ contract, onClose, onDone }: Props) {
    const needsDeposit = Number(contract.depositAmount) > 0;
    const [depositReceived, setDepositReceived] = useState(!needsDeposit);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            onDone(await landlordConfirmContract(contract.id, depositReceived, note.trim() || undefined));
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <ModalShell title="Kích hoạt hợp đồng" subtitle={`${contract.tenantName} · ${contract.roomLabel ?? contract.roomName}`} onClose={onClose}>
            <div className="space-y-3 px-5 py-4 text-sm">
                <p className="text-muted-foreground">
                    Người thuê đã xác nhận hợp đồng. Xác nhận lần cuối để kích hoạt và mở phòng cho người thuê.
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-muted/60 p-4">
                    <dt className="text-muted-foreground">Giá thuê</dt>
                    <dd className="text-right font-semibold"><Money value={contract.monthlyRent} /></dd>
                    <dt className="text-muted-foreground">Tiền cọc</dt>
                    <dd className="text-right font-semibold"><Money value={contract.depositAmount} /></dd>
                    <dt className="text-muted-foreground">Bắt đầu</dt>
                    <dd className="text-right">{formatDate(contract.startDate)}</dd>
                </dl>
                {needsDeposit && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
                        <input type="checkbox" checked={depositReceived} onChange={(e) => setDepositReceived(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" />
                        <span>
                            <span className="block font-medium text-foreground">Đã nhận tiền cọc</span>
                            <span className="block text-xs text-muted-foreground">HexRoom không giữ cọc — bạn xác nhận đã nhận trực tiếp từ người thuê.</span>
                        </span>
                    </label>
                )}
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-foreground">Ghi chú (tuỳ chọn)</span>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                </label>
                {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>
            <footer className="flex justify-end gap-2 border-t border-border px-5 py-4">
                <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Đóng</button>
                <button type="button" onClick={submit} disabled={busy || (needsDeposit && !depositReceived)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                    {busy ? 'Đang kích hoạt...' : 'Kích hoạt hợp đồng'}
                </button>
            </footer>
        </ModalShell>
    );
}

/** Chủ trọ kết thúc hợp đồng (trả phòng). */
export function EndContractModal({ contract, onClose, onDone }: Props) {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            onDone(await endContract(contract.id, reason.trim() || undefined));
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <ModalShell title="Kết thúc hợp đồng" subtitle={`${contract.tenantName} · ${contract.roomLabel ?? contract.roomName}`} onClose={onClose}>
            <div className="space-y-3 px-5 py-4 text-sm">
                <p className="text-muted-foreground">Kết thúc hợp đồng sẽ trả phòng về trạng thái trống và cho phép đăng tin lại.</p>
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-foreground">Lý do</span>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Ví dụ: người thuê trả phòng cuối tháng" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                </label>
                {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>
            <footer className="flex justify-end gap-2 border-t border-border px-5 py-4">
                <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Huỷ</button>
                <button type="button" onClick={submit} disabled={busy} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                    {busy ? 'Đang xử lý...' : 'Kết thúc hợp đồng'}
                </button>
            </footer>
        </ModalShell>
    );
}

/** Giữ màn hình chờ ngắn khi cần thông báo thành công. */
export function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
    return (
        <button type="button" onClick={onClose} className="fixed bottom-6 left-1/2 z-60 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
            <CheckCircle2 className="h-4 w-4 text-primary" />{message}
        </button>
    );
}

/** Đi tới trang thanh toán ví nếu người dùng muốn nộp cọc qua ví. */
export function useGoToWallet() {
    const navigate = useNavigate();
    return () => navigate('/wallet');
}
