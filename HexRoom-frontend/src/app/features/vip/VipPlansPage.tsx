import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Crown, CheckCircle2, WalletCards, ShieldCheck } from 'lucide-react';
import {
    createVipPurchaseRequest,
    fetchAuthMe,
    getAccessToken,
    getVipPackagesRequest,
    verifyVipPurchaseRequest,
    type VipPackageItem,
} from '@/lib/api';
import { Header } from '@/app/features/home/components';
import { trackEvent } from '@/lib/analytics';

type SupportedRole = 'TENANT' | 'LANDLORD';

function formatPrice(amount: number): string {
    return `${Math.round(amount).toLocaleString('vi-VN')} VND`;
}

function formatDuration(days: number): string {
    if (days % 30 === 0) {
        return `${days / 30} tháng`;
    }
    return `${days} ngày`;
}

export function VipPlansPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeRole, setActiveRole] = useState<SupportedRole>('TENANT');
    const [packages, setPackages] = useState<VipPackageItem[]>([]);
    const [loadingPackages, setLoadingPackages] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [purchasePendingId, setPurchasePendingId] = useState<string | null>(null);
    const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
    const [verifyState, setVerifyState] = useState<'idle' | 'loading' | 'pending' | 'success' | 'error'>('idle');
    const [verifyOrderCode, setVerifyOrderCode] = useState<string>('');
    const source = (searchParams.get('source') || 'direct').toLowerCase();

    useEffect(() => {
        trackEvent('vip_plans_viewed', { source });
    }, [source]);

    useEffect(() => {
        let mounted = true;
        async function bootstrapRole() {
            const token = await getAccessToken();
            if (!token) return;
            try {
                const me = await fetchAuthMe();
                const role = me?.user?.role;
                if (!mounted) return;
                if (role === 'LANDLORD') setActiveRole('LANDLORD');
                else if (role === 'TENANT') setActiveRole('TENANT');
            } catch {
                // Keep default role if auth check fails.
            }
        }

        bootstrapRole();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        setLoadingPackages(true);
        setPageError(null);
        getVipPackagesRequest(activeRole)
            .then((res) => {
                if (!mounted) return;
                setPackages(res.data || []);
            })
            .catch((err) => {
                if (!mounted) return;
                setPageError(err?.message || 'Không thể tải gói VIP');
                setPackages([]);
            })
            .finally(() => {
                if (mounted) setLoadingPackages(false);
            });

        return () => {
            mounted = false;
        };
    }, [activeRole]);

    useEffect(() => {
        let mounted = true;
        const orderCode = searchParams.get('orderCode') || searchParams.get('ordercode') || '';
        const type = (searchParams.get('type') || '').toLowerCase();
        if (!orderCode) return;

        setVerifyOrderCode(orderCode);

        if (type === 'cancel') {
            setVerifyState('error');
            setVerifyMessage('Bạn đã hủy thanh toán VIP. Có thể thử lại bất kỳ lúc nào.');
            trackEvent('vip_verify_result', { source, status: 'cancelled' });
            return;
        }

        setVerifyState('loading');
        verifyVipPurchaseRequest(orderCode)
            .then((res) => {
                if (!mounted) return;
                const confirmed = res?.data?.confirmed === true;
                if (confirmed) {
                    setVerifyState('success');
                    setVerifyMessage(res?.message || 'Kích hoạt VIP thành công.');
                    trackEvent('vip_verify_result', { source, status: 'success' });
                } else {
                    setVerifyState('pending');
                    setVerifyMessage(res?.message || 'Thanh toán đang chờ xác nhận. Bạn có thể kiểm tra lại sau vài giây.');
                    trackEvent('vip_verify_result', {
                        source,
                        status: 'not_confirmed',
                        payosStatus: res?.data?.payosStatus || 'unknown',
                    });
                }
            })
            .catch((err) => {
                if (!mounted) return;
                setVerifyState('error');
                setVerifyMessage(err?.message || 'Không thể xác minh thanh toán VIP.');
                trackEvent('vip_verify_result', { source, status: 'error' });
            });

        return () => {
            mounted = false;
        };
    }, [searchParams, source]);

    const handleRetryVerify = async () => {
        if (!verifyOrderCode) return;
        setVerifyState('loading');
        try {
            const res = await verifyVipPurchaseRequest(verifyOrderCode);
            const confirmed = res?.data?.confirmed === true;
            if (confirmed) {
                setVerifyState('success');
                setVerifyMessage(res?.message || 'Kích hoạt VIP thành công.');
                return;
            }
            setVerifyState('pending');
            setVerifyMessage(res?.message || 'Thanh toán vẫn đang chờ xác nhận.');
        } catch (err) {
            setVerifyState('error');
            setVerifyMessage(err instanceof Error ? err.message : 'Không thể xác minh thanh toán VIP.');
        }
    };

    const roleLabel = useMemo(() => {
        return activeRole === 'TENANT' ? 'Người thuê' : 'Chủ trọ';
    }, [activeRole]);

    const handlePurchase = async (pkg: VipPackageItem) => {
        setPurchasePendingId(pkg.id);
        trackEvent('vip_purchase_clicked', {
            source,
            packageId: pkg.id,
            targetRole: pkg.targetRole,
            durationDays: pkg.durationDays,
            price: pkg.price,
        });
        try {
            const token = await getAccessToken();
            if (!token) {
                trackEvent('vip_purchase_redirect_login', { source });
                navigate('/login');
                return;
            }

            const result = await createVipPurchaseRequest(pkg.id);
            const checkoutUrl = result?.data?.payment?.checkoutUrl;
            if (!checkoutUrl) {
                throw new Error('Không nhận được link thanh toán từ hệ thống');
            }
            window.location.href = checkoutUrl;
        } catch (err) {
            setPageError(err instanceof Error ? err.message : 'Không thể tạo thanh toán VIP');
        } finally {
            setPurchasePendingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Header onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
                <section className="rounded-3xl border border-amber-200 bg-linear-to-br from-amber-50 via-background to-orange-50 p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                            <Crown className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Nâng cấp EZ-Room VIP</h1>
                            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
                                Mở khóa tính năng cao cấp cho {roleLabel.toLowerCase()}, ưu tiên trải nghiệm và tăng hiệu quả tìm kiếm/đăng tin.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveRole('TENANT');
                                trackEvent('vip_role_tab_selected', { source, role: 'TENANT' });
                            }}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeRole === 'TENANT'
                                ? 'bg-amber-600 text-white'
                                : 'bg-white text-foreground border border-border hover:bg-muted'
                                }`}
                        >
                            Gói cho Tenant
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveRole('LANDLORD');
                                trackEvent('vip_role_tab_selected', { source, role: 'LANDLORD' });
                            }}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeRole === 'LANDLORD'
                                ? 'bg-amber-600 text-white'
                                : 'bg-white text-foreground border border-border hover:bg-muted'
                                }`}
                        >
                            Gói cho Landlord
                        </button>
                    </div>
                </section>

                {verifyMessage && (
                    <section
                        className={`mt-6 rounded-2xl border p-4 ${verifyState === 'success'
                            ? 'border-emerald-300 bg-emerald-50'
                            : verifyState === 'loading'
                                ? 'border-sky-300 bg-sky-50'
                                : verifyState === 'pending'
                                    ? 'border-blue-300 bg-blue-50'
                                    : 'border-amber-300 bg-amber-50'
                            }`}
                    >
                        <p className="text-sm font-medium text-foreground">{verifyMessage}</p>
                        {verifyState === 'pending' && (
                            <button
                                type="button"
                                onClick={() => void handleRetryVerify()}
                                className="mt-3 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
                            >
                                Kiểm tra lại trạng thái thanh toán
                            </button>
                        )}
                    </section>
                )}

                {pageError && (
                    <section className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
                        <p className="text-sm text-destructive">{pageError}</p>
                    </section>
                )}

                <section className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {loadingPackages && (
                        <div className="col-span-full rounded-2xl border border-border bg-card p-6 text-muted-foreground">
                            Đang tải danh sách gói VIP...
                        </div>
                    )}

                    {!loadingPackages && packages.length === 0 && (
                        <div className="col-span-full rounded-2xl border border-border bg-card p-6 text-muted-foreground">
                            Hiện chưa có gói VIP nào cho nhóm người dùng này.
                        </div>
                    )}

                    {!loadingPackages && packages.map((pkg) => (
                        <article key={pkg.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                            <header className="flex items-start justify-between gap-3">
                                <h2 className="text-lg font-semibold text-foreground">{pkg.name}</h2>
                                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                                    {formatDuration(pkg.durationDays)}
                                </span>
                            </header>

                            <p className="mt-2 text-sm text-muted-foreground min-h-10">
                                {pkg.description || 'Gói nâng cấp quyền lợi VIP cho trải nghiệm cao cấp hơn.'}
                            </p>

                            <p className="mt-4 text-2xl font-bold text-foreground">{formatPrice(pkg.price)}</p>

                            <ul className="mt-4 space-y-2 text-sm text-foreground">
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    Mở khóa tính năng nâng cao theo gói {pkg.targetRole}
                                </li>
                                <li className="flex items-center gap-2">
                                    <WalletCards className="w-4 h-4 text-sky-600" />
                                    Thanh toán an toàn qua PayOS
                                </li>
                                <li className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-violet-600" />
                                    Kích hoạt tự động ngay sau xác nhận thanh toán
                                </li>
                            </ul>

                            <button
                                type="button"
                                onClick={() => handlePurchase(pkg)}
                                disabled={purchasePendingId === pkg.id}
                                className="mt-5 w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                            >
                                {purchasePendingId === pkg.id ? 'Đang tạo thanh toán...' : 'Mua gói này'}
                            </button>
                        </article>
                    ))}
                </section>

                <div className="mt-8 text-sm text-muted-foreground">
                    <Link to="/search" className="underline hover:text-foreground">
                        Quay lại tìm kiếm
                    </Link>
                </div>
            </main>
        </div>
    );
}
