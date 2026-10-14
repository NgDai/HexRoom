import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyWalletDepositRequest } from '@/lib/api';

function normalizeStatus(searchParams: URLSearchParams, routeIsCancel: boolean): 'success' | 'cancel' | 'pending' {
    if (routeIsCancel) return 'cancel';
    const code = (searchParams.get('code') || '').toUpperCase();
    const status = (searchParams.get('status') || '').toUpperCase();
    if (code === '00' || status === 'PAID' || status === 'SUCCESS') return 'success';
    if (status === 'CANCELLED') return 'cancel';
    return 'pending';
}

interface WalletPaymentResultPageProps {
    isCancel?: boolean;
}

export function WalletPaymentResultPage({ isCancel = false }: WalletPaymentResultPageProps) {
    const [searchParams] = useSearchParams();
    const initialState = normalizeStatus(searchParams, isCancel);
    const orderCode = searchParams.get('orderCode') || '';

    const [verifying, setVerifying] = useState(initialState === 'success' && !!orderCode);
    const [state, setState] = useState<'success' | 'cancel' | 'pending'>(initialState);
    const [verifyError, setVerifyError] = useState<string | null>(null);

    useEffect(() => {
        if (initialState !== 'success' || !orderCode) return;

        let cancelled = false;
        verifyWalletDepositRequest(orderCode)
            .then((res) => {
                if (cancelled) return;
                setState(res.data?.confirmed || res.data?.alreadyConfirmed ? 'success' : 'pending');
            })
            .catch((err) => {
                if (cancelled) return;
                setVerifyError(err instanceof Error ? err.message : 'Xác minh thất bại');
                setState('pending');
            })
            .finally(() => {
                if (!cancelled) setVerifying(false);
            });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const icon = verifying ? '⏳' : state === 'success' ? '✅' : state === 'cancel' ? '❌' : '⏳';

    const title = verifying
        ? 'Đang xác minh giao dịch...'
        : state === 'success'
            ? 'Nạp tiền ví thành công'
            : state === 'cancel'
                ? 'Bạn đã hủy nạp tiền'
                : 'Đang xử lý giao dịch';

    const description = verifying
        ? 'Vui lòng đợi trong giây lát...'
        : state === 'success'
            ? 'Số tiền đã được cộng vào ví của bạn. Bạn có thể kiểm tra số dư ví ngay bây giờ.'
            : state === 'cancel'
                ? 'Giao dịch nạp tiền đã bị hủy. Bạn có thể thử lại trong trang ví.'
                : verifyError
                    ? `Không thể xác minh tự động: ${verifyError}. Vui lòng kiểm tra ví sau ít phút.`
                    : 'Giao dịch đang được đồng bộ. Vui lòng kiểm tra lại số dư ví trong giây lát.';

    return (
        <main className="min-h-screen bg-background flex items-center justify-center px-4">
            <section className="w-full max-w-xl rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
                <div className="text-5xl mb-4">{icon}</div>
                <h1 className="text-2xl font-bold text-foreground mb-3">{title}</h1>
                <p className="text-muted-foreground mb-6">{description}</p>

                {!verifying && (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            to="/wallet"
                            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                        >
                            Xem ví của tôi
                        </Link>
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-foreground font-medium hover:bg-muted transition-colors"
                        >
                            Về trang chủ
                        </Link>
                    </div>
                )}
            </section>
        </main>
    );
}
