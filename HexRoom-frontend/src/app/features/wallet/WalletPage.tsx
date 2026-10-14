import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { Header, Footer } from '@/app/features/home/components';
import {
    depositWalletRequest,
    getMyWalletRequest,
    getMyWalletTransactionsRequest,
    verifyWalletDepositRequest,
    withdrawWalletRequest,
    type WalletSummary,
    type WalletTransactionItem,
} from '@/lib/api';
import { useAuth } from '@/app/context/useAuth';
import { trackEvent } from '@/lib/analytics';

type ActionType = 'DEPOSIT' | 'WITHDRAW';
type TransactionFilter = 'ALL' | WalletTransactionItem['type'];

const transactionFilterOptions: Array<{ value: TransactionFilter; label: string }> = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'PREORDER', label: 'Đặt cọc' },
    { value: 'DEPOSIT', label: 'Nạp tiền' },
    { value: 'WITHDRAW', label: 'Rút tiền' },
    { value: 'PAYMENT', label: 'Thanh toán' },
    { value: 'REFUND', label: 'Hoàn tiền' },
];

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

function formatMoney(v: number): string {
    return currencyFormatter.format(v || 0);
}

function txTypeLabel(type: WalletTransactionItem['type']): string {
    if (type === 'DEPOSIT') return 'Nạp tiền';
    if (type === 'WITHDRAW') return 'Rút tiền';
    if (type === 'REFUND') return 'Hoàn tiền';
    if (type === 'PAYMENT') return 'Thanh toán';
    if (type === 'PREORDER') return 'Đặt cọc';
    return type;
}

export function WalletPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const embeddedInRentalMgmt = location.pathname.startsWith('/rental-management');
    const { user } = useAuth();
    const [wallet, setWallet] = useState<WalletSummary | null>(null);
    const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [actionType, setActionType] = useState<ActionType>('DEPOSIT');
    const [amountText, setAmountText] = useState('');
    const [description, setDescription] = useState('');
    const [redirectingToPayOS, setRedirectingToPayOS] = useState(false);
    const [verifyingPayOS, setVerifyingPayOS] = useState(false);
    const [filterType, setFilterType] = useState<TransactionFilter>('ALL');

    const amount = useMemo(() => Number(amountText), [amountText]);
    const canUpgradeVip =
        user != null &&
        (user.role === 'TENANT' || user.role === 'LANDLORD') &&
        user.isVip !== true;

    const fetchWalletSnapshot = async (selectedFilter: TransactionFilter = filterType) => {
        const transactionType = selectedFilter === 'ALL' ? undefined : selectedFilter;
        const [walletRes, txRes] = await Promise.all([
            getMyWalletRequest(),
            getMyWalletTransactionsRequest({ page: 1, limit: 20, type: transactionType }),
        ]);
        return {
            wallet: walletRes.data,
            transactions: txRes.data || [],
        };
    };

    const loadWallet = async (selectedFilter: TransactionFilter = filterType) => {
        const snapshot = await fetchWalletSnapshot(selectedFilter);
        setWallet(snapshot.wallet);
        setTransactions(snapshot.transactions);
    };

    useEffect(() => {
        setLoading(true);
        loadWallet(filterType)
            .catch((e) => setError(e instanceof Error ? e.message : 'Không tải được ví'))
            .finally(() => setLoading(false));
    }, [filterType]);

    useEffect(() => {
        const pollIntervalMs = 20000;
        const intervalId = window.setInterval(() => {
            const currentBalance = wallet?.balance || 0;

            fetchWalletSnapshot(filterType)
                .then((snapshot) => {
                    setWallet(snapshot.wallet);
                    setTransactions(snapshot.transactions);

                    if (snapshot.wallet.balance > currentBalance) {
                        setMessage('Ví đã được cập nhật: bạn vừa nhận thêm tiền.');
                    }
                })
                .catch(() => {
                    // Ignore transient polling errors to avoid noisy UX.
                });
        }, pollIntervalMs);

        return () => window.clearInterval(intervalId);
    }, [wallet?.balance, filterType]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const source = (params.get('source') || '').toLowerCase();
        const type = (params.get('type') || '').toLowerCase();
        const orderCode = params.get('orderCode') || params.get('ordercode') || '';

        if (source !== 'payos') return;

        if (type === 'cancel') {
            setMessage('Bạn đã hủy giao dịch nạp tiền.');
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        if (!orderCode) {
            setError('Không nhận được mã giao dịch PayOS để xác minh nạp ví.');
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        setVerifyingPayOS(true);
        setError(null);
        verifyWalletDepositRequest(orderCode)
            .then(async (res) => {
                const confirmed = Boolean(res.data?.confirmed || res.data?.alreadyConfirmed);
                if (!confirmed) {
                    const payosStatus = res.data?.payosStatus || 'PENDING';
                    setMessage(`Giao dịch đang ${payosStatus}. Vui lòng kiểm tra lại sau.`);
                    return;
                }

                setMessage('Nạp tiền thành công. Số dư ví đã được cập nhật.');
                await loadWallet(filterType);
            })
            .catch((e) => {
                setError(e instanceof Error ? e.message : 'Không thể xác minh giao dịch nạp ví');
            })
            .finally(() => {
                setVerifyingPayOS(false);
                window.history.replaceState({}, document.title, window.location.pathname);
            });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Vui lòng nhập số tiền hợp lệ');
            return;
        }

        setSubmitting(true);
        try {
            const body = {
                amount,
                description: description.trim() || undefined,
            };
            if (actionType === 'DEPOSIT') {
                const res = await depositWalletRequest(body);
                const checkoutUrl = res?.data?.payment?.checkoutUrl;
                if (!checkoutUrl) {
                    throw new Error('Không nhận được link thanh toán PayOS cho nạp ví');
                }

                setMessage('Đang chuyển tới PayOS để nạp ví...');
                setRedirectingToPayOS(true);
                window.setTimeout(() => {
                    window.location.href = checkoutUrl;
                }, 500);
                return;
            } else {
                const res = await withdrawWalletRequest(body);
                setMessage(res.message || 'Rút tiền thành công');
            }
            setAmountText('');
            setDescription('');
            await loadWallet(filterType);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const content = (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Ví tiền</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Quản lý số dư và lịch sử giao dịch.
                </p>
            </div>

            {canUpgradeVip && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                    <p className="text-sm text-amber-900">Tài khoản thường đang bị giới hạn một số quyền lợi. Nâng cấp VIP để mở rộng trải nghiệm.</p>
                        <button
                            type="button"
                            onClick={() => {
                                trackEvent('vip_cta_clicked', { source: 'wallet' });
                                navigate('/vip-plans?source=wallet');
                            }}
                            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                        >
                            <Crown className="h-3.5 w-3.5" />
                            Nâng cấp VIP
                        </button>
                    </div>
                )}

                {!canUpgradeVip && user?.isVip === true && (
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <Crown className="h-3.5 w-3.5" />
                        Tài khoản VIP đang hoạt động
                    </div>
                )}

                {redirectingToPayOS && (
                    <div className="mb-4 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary">
                        Đang chuyển tới PayOS...
                    </div>
                )}

                {verifyingPayOS && (
                    <div className="mb-4 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary">
                        Đang xác minh giao dịch nạp ví từ PayOS...
                    </div>
                )}

                <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm mb-6">
                    {loading ? (
                        <p className="text-muted-foreground">Đang tải số dư...</p>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground">Số dư hiện tại</p>
                            <p className="text-3xl font-bold text-primary mt-1">
                                {formatMoney(wallet?.balance || 0)}
                            </p>
                        </>
                    )}
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm mb-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Nạp / Rút tiền</h2>
                    {error && <div className="mb-3 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{error}</div>}
                    {message && <div className="mb-3 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary">{message}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setActionType('DEPOSIT')}
                                className={`px-4 py-2 rounded-xl border text-sm font-medium ${actionType === 'DEPOSIT' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                            >
                                Nạp tiền
                            </button>
                            <button
                                type="button"
                                onClick={() => setActionType('WITHDRAW')}
                                className={`px-4 py-2 rounded-xl border text-sm font-medium ${actionType === 'WITHDRAW' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                            >
                                Rút tiền
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                type="number"
                                value={amountText}
                                onChange={(e) => setAmountText(e.target.value)}
                                placeholder="Số tiền (VND)"
                                min={1}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ghi chú (không bắt buộc)"
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-60"
                        >
                            {submitting ? 'Đang xử lý...' : actionType === 'DEPOSIT' ? 'Xác nhận nạp tiền' : 'Xác nhận rút tiền'}
                        </button>
                    </form>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Lịch sử giao dịch</h2>
                    <div className="mb-4 flex flex-wrap gap-2">
                        {transactionFilterOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setFilterType(option.value)}
                                className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${filterType === option.value
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'border-border hover:bg-muted'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    {loading ? (
                        <p className="text-muted-foreground">Đang tải lịch sử...</p>
                    ) : transactions.length === 0 ? (
                        <p className="text-muted-foreground">
                            {filterType === 'ALL' ? 'Chưa có giao dịch nào.' : `Chưa có giao dịch ${txTypeLabel(filterType)}.`}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((tx) => (
                                <div key={tx.id} className="border border-border rounded-xl px-4 py-3 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-medium text-foreground">{txTypeLabel(tx.type)}</p>
                                        <p className="text-sm text-muted-foreground">{tx.description || '—'}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(tx.createdAt).toLocaleString('vi-VN')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-semibold ${tx.type === 'DEPOSIT' || tx.type === 'REFUND' || tx.type === 'PREORDER' ? 'text-primary' : 'text-foreground'}`}>
                                            {tx.type === 'DEPOSIT' || tx.type === 'REFUND' || tx.type === 'PREORDER' ? '+' : '-'}{formatMoney(tx.amount)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">{tx.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
        </div>
    );

    if (embeddedInRentalMgmt) {
        return content;
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
                {content}
            </main>
            <Footer />
        </div>
    );
}
