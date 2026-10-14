import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
    Crown,
    CheckCircle2,
    Clock,
    RefreshCw,
    ShieldCheck,
    Zap,
    Star,
    Eye,
    MessageCircle,
    Search,
    Receipt,
    ChevronRight,
    AlertCircle,
} from 'lucide-react';
import { getMyVipStatusRequest, getVipPackagesRequest, createVipPurchaseRequest, type VipStatusData, type VipPurchaseHistory, type VipPackageItem } from '@/lib/api';
import { useAuth } from '@/app/context/useAuth';
import { Header } from '@/app/features/home/components';

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function formatPrice(amount: number): string {
    return `${Math.round(amount).toLocaleString('vi-VN')} VND`;
}

function formatDuration(days: number, t: (k: string, o?: Record<string, unknown>) => string): string {
    if (days % 30 === 0) return `${days / 30} ${t('vip.months', { defaultValue: 'months' })}`;
    return `${days} ${t('vip.days', { defaultValue: 'days' })}`;
}

const TENANT_BENEFIT_KEYS = [
    { icon: Search, key: 'aiImageSearch' },
    { icon: Eye, key: 'viewContact' },
    { icon: Star, key: 'priorityRecommend' },
    { icon: MessageCircle, key: 'unlimitedChat' },
    { icon: ShieldCheck, key: 'vipBadge' },
];

const LANDLORD_BENEFIT_KEYS = [
    { icon: Star, key: 'postMore' },
    { icon: Eye, key: 'priorityDisplay' },
    { icon: ShieldCheck, key: 'verifiedBadge' },
    { icon: Zap, key: 'analytics' },
    { icon: MessageCircle, key: 'instantNotify' },
    { icon: Search, key: 'aiSearch' },
];

interface PackageCardProps {
    pkg: VipPackageItem;
    onBuy: (pkg: VipPackageItem) => void;
    loading: boolean;
    isRenewal?: boolean;
}

function PackageCard({ pkg, onBuy, loading, isRenewal }: PackageCardProps) {
    const { t } = useTranslation();
    const pricePerMonth = pkg.durationDays >= 30
        ? Math.round(pkg.price / (pkg.durationDays / 30))
        : pkg.price;

    return (
        <div className={`relative rounded-2xl border-2 p-5 transition-all hover:shadow-lg cursor-pointer ${isRenewal ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20' : 'border-border bg-card hover:border-violet-300'}`}>
            {isRenewal && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    {t('vip.popularRenewal')}
                </span>
            )}
            <div className="mb-3">
                <h3 className="font-bold text-foreground text-base">{pkg.name}</h3>
                {pkg.description && (
                    <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>
                )}
            </div>
            <div className="mb-4">
                <div className="text-2xl font-extrabold text-violet-600">{formatPrice(pkg.price)}</div>
                <div className="text-xs text-muted-foreground">
                    {formatDuration(pkg.durationDays, t)}
                    {pkg.durationDays >= 60 && (
                        <span className="ml-2 text-violet-500 font-medium">
                            ≈ {formatPrice(pricePerMonth)}{t('vip.perMonth')}
                        </span>
                    )}
                </div>
            </div>
            <button
                type="button"
                onClick={() => onBuy(pkg)}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
                {loading ? t('vip.processing') : t('vip.renewNowBtn')}
            </button>
        </div>
    );
}

function PurchaseStatusBadge({ isActive }: { isActive: boolean }) {
    const { t } = useTranslation();
    return (
        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
            {isActive ? t('vip.currentPackage') : t('vip.expiredPackage')}
        </span>
    );
}

function PurchaseRow({ p }: { p: VipPurchaseHistory }) {
    const { t } = useTranslation();
    const isActive = new Date(p.endDate) > new Date();
    return (
        <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-violet-100 text-violet-600' : 'bg-muted text-muted-foreground'}`}>
                <Crown className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{p.packageName}</p>
                <p className="text-xs text-muted-foreground">
                    {formatDate(p.startDate)} → {formatDate(p.endDate)}
                    <span className="ml-2">· {formatDuration(p.durationDays, t)}</span>
                </p>
            </div>
            <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-foreground">{formatPrice(p.pricePaid)}</div>
                <PurchaseStatusBadge isActive={isActive} />
            </div>
        </div>
    );
}

export function VipManagementPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, refreshUser } = useAuth();

    const [status, setStatus] = useState<VipStatusData | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [packages, setPackages] = useState<VipPackageItem[]>([]);
    const [loadingPackages, setLoadingPackages] = useState(true);
    const [buyingId, setBuyingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const userRole = (user?.role as 'TENANT' | 'LANDLORD') || 'TENANT';
    const benefitKeys = userRole === 'LANDLORD' ? LANDLORD_BENEFIT_KEYS : TENANT_BENEFIT_KEYS;

    useEffect(() => {
        setLoadingStatus(true);
        getMyVipStatusRequest()
            .then((r) => setStatus(r.data))
            .catch(() => setStatus(null))
            .finally(() => setLoadingStatus(false));
    }, []);

    useEffect(() => {
        setLoadingPackages(true);
        getVipPackagesRequest(userRole)
            .then((r) => setPackages(r.data || []))
            .catch(() => setPackages([]))
            .finally(() => setLoadingPackages(false));
    }, [userRole]);

    const handleBuy = async (pkg: VipPackageItem) => {
        setBuyingId(pkg.id);
        setError(null);
        try {
            const res = await createVipPurchaseRequest(pkg.id);
            const checkoutUrl = res?.data?.payment?.checkoutUrl;
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                setError(res?.message || t('common.error'));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('common.error'));
        } finally {
            setBuyingId(null);
        }
    };

    const now = new Date();
    const expiryDate = status?.vipExpiresAt ? new Date(status.vipExpiresAt) : null;
    const isVipActive = status?.isVip === true && expiryDate && expiryDate > now;
    const daysLeft = status?.daysRemaining ?? 0;

    const urgencyColor =
        daysLeft > 30 ? 'text-green-600' :
        daysLeft > 7 ? 'text-amber-600' :
        'text-red-600';

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
                {/* Page header */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-6 h-6 text-violet-500" />
                        <h1 className="text-2xl font-bold text-foreground">{t('vip.managementTitle')}</h1>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        {t('vip.managementSubtitle')}
                    </p>
                </div>

                {/* VIP Status card */}
                <div className={`rounded-2xl p-6 mb-6 border-2 ${isVipActive ? 'bg-gradient-to-br from-violet-600 to-purple-700 border-violet-500 text-white' : 'bg-card border-border'}`}>
                    {loadingStatus ? (
                        <div className="h-20 flex items-center justify-center text-sm opacity-60">{t('vip.loading')}</div>
                    ) : isVipActive ? (
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Crown className="w-6 h-6 text-yellow-300" />
                                    <span className="font-bold text-xl">{t('vip.activeStatus')}</span>
                                    <span className="bg-yellow-300/20 border border-yellow-300/40 text-yellow-200 text-xs font-semibold px-2 py-0.5 rounded-full">ACTIVE</span>
                                </div>
                                <p className="text-violet-200 text-sm mb-1">
                                    {t('vip.expiresOn')} <span className="font-semibold text-white">{formatDate(status?.vipExpiresAt)}</span>
                                </p>
                                <p className={`text-sm font-semibold ${daysLeft <= 7 ? 'text-yellow-300' : 'text-violet-100'}`}>
                                    {daysLeft <= 7
                                        ? t('vip.expiringSoonWarning', { n: daysLeft })
                                        : t('vip.daysOk', { n: daysLeft })}
                                </p>
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                                <Crown className="w-8 h-8 text-yellow-300" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-5 h-5 text-amber-500" />
                                    <span className="font-bold text-lg text-foreground">
                                        {status?.purchases?.length ? t('vip.expiredStatus') : t('vip.noVipStatus')}
                                    </span>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    {status?.purchases?.length
                                        ? t('vip.expiredOn', { date: formatDate(status.vipExpiresAt) })
                                        : t('vip.upgradeDesc')}
                                </p>
                            </div>
                            <Link
                                to="/vip-plans"
                                className="shrink-0 inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors no-underline"
                            >
                                <Crown className="w-4 h-4" />
                                {t('vip.buyVip')}
                            </Link>
                        </div>
                    )}
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* Benefits */}
                    <div className="bg-card rounded-2xl border border-border p-5">
                        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-violet-500" />
                            {t('vip.yourBenefits')}
                        </h2>
                        <ul className="space-y-2.5">
                            {benefitKeys.map(({ icon: Icon, key }) => (
                                <li key={key} className="flex items-center gap-2.5 text-sm">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isVipActive ? 'bg-violet-100 text-violet-600' : 'bg-muted text-muted-foreground'}`}>
                                        <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <span className={isVipActive ? 'text-foreground' : 'text-muted-foreground'}>
                                        {t(`vip.benefits.${key}`)}
                                    </span>
                                    {isVipActive && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto shrink-0" />}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Quick stats */}
                    <div className="space-y-4">
                        <div className="bg-card rounded-2xl border border-border p-5">
                            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-violet-500" />
                                {t('vip.stats')}
                            </h2>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/50 rounded-xl p-3 text-center">
                                    <div className={`text-2xl font-extrabold ${isVipActive ? urgencyColor : 'text-muted-foreground'}`}>
                                        {isVipActive ? daysLeft : 0}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">{t('vip.daysLeft')}</div>
                                </div>
                                <div className="bg-muted/50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-extrabold text-foreground">
                                        {status?.purchases?.length ?? 0}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">{t('vip.purchaseCount')}</div>
                                </div>
                            </div>
                        </div>

                        {isVipActive && daysLeft <= 30 && (
                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('vip.expiringSoon')}</p>
                                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                        {t('vip.expiringSoonDesc')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Renewal packages */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-foreground flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-violet-500" />
                            {isVipActive ? t('vip.renewVip') : t('vip.choosePackage')}
                        </h2>
                        <Link
                            to="/vip-plans"
                            className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1 no-underline font-medium"
                        >
                            {t('vip.viewAll')} <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {error && (
                        <div className="mb-4 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {loadingPackages ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">{t('vip.loadingPackages')}</div>
                    ) : packages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">{t('vip.noPackages')}</div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {packages.slice(0, 3).map((pkg, i) => (
                                <PackageCard
                                    key={pkg.id}
                                    pkg={pkg}
                                    onBuy={handleBuy}
                                    loading={buyingId === pkg.id}
                                    isRenewal={i === 1}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Purchase history */}
                <div className="bg-card rounded-2xl border border-border p-5">
                    <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-violet-500" />
                        {t('vip.purchaseHistory')}
                    </h2>
                    {loadingStatus ? (
                        <div className="py-6 text-center text-muted-foreground text-sm">{t('vip.loadingHistory')}</div>
                    ) : !status?.purchases?.length ? (
                        <div className="py-8 text-center">
                            <Crown className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-muted-foreground text-sm">{t('vip.noHistory')}</p>
                        </div>
                    ) : (
                        <div>
                            {status.purchases.map((p) => (
                                <PurchaseRow key={p.id} p={p} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick actions */}
                <div className="mt-6 flex gap-3 flex-wrap">
                    <button
                        type="button"
                        onClick={() => {
                            setLoadingStatus(true);
                            Promise.all([
                                getMyVipStatusRequest().then((r) => setStatus(r.data)).catch(() => {}),
                                refreshUser(),
                            ]).finally(() => setLoadingStatus(false));
                        }}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        {t('vip.refreshStatus')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/wallet')}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {t('vip.viewWallet')}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </main>
        </div>
    );
}
