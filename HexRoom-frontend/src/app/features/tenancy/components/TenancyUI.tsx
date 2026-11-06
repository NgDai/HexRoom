import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Clock, FileText, Home, Wallet } from 'lucide-react';
import type { ContractStatus, InvoiceStatus } from '@/lib/tenancy-api';

/* Shared primitives for the tenancy (quản lý trọ) screens. */

const CARD = 'rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_-12px_rgba(15,23,42,.10)]';

export function SectionCard({
    title,
    description,
    action,
    children,
    className = '',
}: {
    title?: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={`${CARD} ${className}`}>
            {(title || action) && (
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
                    <div className="min-w-0">
                        {title && <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>}
                        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
                    </div>
                    {action}
                </header>
            )}
            <div className="p-5">{children}</div>
        </section>
    );
}

export function StatTile({
    label,
    value,
    hint,
    icon,
    tone = 'default',
}: {
    label: string;
    value: string;
    hint?: string;
    icon: ReactNode;
    tone?: 'default' | 'warning' | 'success' | 'info';
}) {
    const tones: Record<string, string> = {
        default: 'bg-muted text-muted-foreground',
        warning: 'bg-amber-500/15 text-amber-600',
        success: 'bg-primary/15 text-primary',
        info: 'bg-sky-500/15 text-sky-600',
    };
    return (
        <div className={`${CARD} flex items-start gap-3 p-4`}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>{icon}</span>
            <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-1 truncate font-heading text-xl font-bold text-foreground">{value}</p>
                {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
            </div>
        </div>
    );
}

const CONTRACT_META: Record<ContractStatus, { label: string; cls: string; icon: ReactNode }> = {
    DRAFT: { label: 'Nháp', cls: 'bg-muted text-muted-foreground border-border', icon: <FileText className="h-3 w-3" /> },
    PENDING_TENANT: { label: 'Chờ bạn xác nhận', cls: 'bg-amber-500/15 text-amber-700 border-amber-300', icon: <Clock className="h-3 w-3" /> },
    PENDING_LANDLORD: { label: 'Chờ chủ trọ xác nhận', cls: 'bg-sky-500/15 text-sky-700 border-sky-300', icon: <Clock className="h-3 w-3" /> },
    ACTIVE: { label: 'Đang hiệu lực', cls: 'bg-primary/15 text-primary border-primary/30', icon: <CheckCircle2 className="h-3 w-3" /> },
    REJECTED: { label: 'Đã từ chối', cls: 'bg-rose-500/15 text-rose-600 border-rose-300', icon: <AlertCircle className="h-3 w-3" /> },
    CANCELLED: { label: 'Đã huỷ', cls: 'bg-muted text-muted-foreground border-border', icon: <AlertCircle className="h-3 w-3" /> },
    ENDED: { label: 'Đã kết thúc', cls: 'bg-muted text-muted-foreground border-border', icon: <Home className="h-3 w-3" /> },
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
    const meta = CONTRACT_META[status] ?? CONTRACT_META.DRAFT;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.cls}`}>
            {meta.icon}
            {meta.label}
        </span>
    );
}

const INVOICE_META: Record<InvoiceStatus, { label: string; cls: string }> = {
    ISSUED: { label: 'Chờ thanh toán', cls: 'bg-amber-500/15 text-amber-700 border-amber-300' },
    TENANT_CONFIRMED: { label: 'Chờ chủ trọ xác nhận', cls: 'bg-sky-500/15 text-sky-700 border-sky-300' },
    PAID: { label: 'Đã thanh toán', cls: 'bg-primary/15 text-primary border-primary/30' },
    OVERDUE: { label: 'Quá hạn', cls: 'bg-rose-500/15 text-rose-600 border-rose-300' },
    CANCELLED: { label: 'Đã huỷ', cls: 'bg-muted text-muted-foreground border-border' },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
    const meta = INVOICE_META[status] ?? INVOICE_META.ISSUED;
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.cls}`}>
            {meta.label}
        </span>
    );
}

export function Money({ value, className = '' }: { value: number | null | undefined; className?: string }) {
    if (value === null || value === undefined) return <span className={className}>Chưa xác định</span>;
    return <span className={className}>{new Intl.NumberFormat('vi-VN').format(Math.round(value))} ₫</span>;
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</span>
            <div>
                <p className="font-heading text-base font-semibold text-foreground">{title}</p>
                {description && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
            </div>
            {action}
        </div>
    );
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2 text-sm">
            <span className="shrink-0 text-muted-foreground">{label}</span>
            <span className="text-right font-medium text-foreground">{children}</span>
        </div>
    );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{message}</span>
            {onRetry && (
                <button type="button" onClick={onRetry} className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-rose-100">
                    Thử lại
                </button>
            )}
        </div>
    );
}

export function WalletIcon() {
    return <Wallet className="h-5 w-5" />;
}

export function formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    // LocalDate ("yyyy-MM-dd") parsed as UTC would shift a day in UTC+7, so keep it as calendar text.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-');
        return `${d}/${m}/${y}`;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('vi-VN');
}

export function formatDateTime(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const CARD_CLASS = CARD;
