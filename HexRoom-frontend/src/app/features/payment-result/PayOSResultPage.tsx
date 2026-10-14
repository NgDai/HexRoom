import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyPreorderPaymentRequest } from '@/lib/api';

function normalizeStatus(searchParams: URLSearchParams): 'success' | 'cancel' | 'pending' {
    const code = (searchParams.get('code') || '').toUpperCase();
    const status = (searchParams.get('status') || '').toUpperCase();
    const type = (searchParams.get('type') || '').toLowerCase();

    if (type === 'cancel' || status === 'CANCELLED') return 'cancel';
    if (code === '00' || status === 'PAID' || status === 'SUCCESS') return 'success';
    return 'pending';
}

export function PayOSResultPage() {
    const [searchParams] = useSearchParams();
    const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
    const [verifiedSuccess, setVerifiedSuccess] = useState(false);

    const preorderId = searchParams.get('preorderId') || '';
    const orderCode = searchParams.get('orderCode') || '';
    const initialState = normalizeStatus(searchParams);
    const [state, setState] = useState<'success' | 'cancel' | 'pending'>(initialState);
    const shouldAttemptVerify = initialState !== 'cancel' && (!!orderCode || !!preorderId);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [verifyDone, setVerifyDone] = useState(!shouldAttemptVerify);
    const verifying = shouldAttemptVerify && !verifyDone;

    useEffect(() => {
        if (!shouldAttemptVerify) {
            return;
        }

        let cancelled = false;
        verifyPreorderPaymentRequest({
            orderCode: orderCode || undefined,
            preorderId: preorderId || undefined,
        })
            .then((res) => {
                if (cancelled) return;
                const nextState = res.data?.status || 'pending';
                setState(nextState);

                if (nextState === 'success') {
                    setVerifiedSuccess(true);
                    setVerifyMessage('Thanh toán đã được đồng bộ vào hệ thống.');
                } else if (nextState === 'pending') {
                    setVerifyMessage('Thanh toán đang chờ xử lý. Vui lòng kiểm tra lại sau ít phút.');
                } else {
                    setVerifyMessage('Thanh toán chưa thành công hoặc đã bị hủy.');
                }
            })
            .catch((err) => {
                if (cancelled) return;
                setVerifyError(err instanceof Error ? err.message : 'Xác minh thất bại');
                setVerifyMessage(err instanceof Error ? err.message : 'Không thể đồng bộ trạng thái thanh toán.');
                setState(initialState === 'success' ? 'pending' : initialState);
            })
            .finally(() => {
                if (!cancelled) setVerifyDone(true);
            });

        return () => {
            cancelled = true;
        };
    }, [shouldAttemptVerify, orderCode, preorderId, initialState]);

    const title = verifying
        ? 'Đang xác minh giao dịch...'
        : state === 'success'
            ? 'Thanh toán đặt cọc thành công'
            : state === 'cancel'
                ? 'Bạn đã hủy thanh toán'
                : 'Đã nhận trạng thái thanh toán';

    const description = verifying
        ? 'Vui lòng đợi trong giây lát để hệ thống đối soát trạng thái thanh toán với PayOS.'
        : state === 'success'
            ? 'Hệ thống đã ghi nhận giao dịch. Vui lòng chờ chủ trọ xác nhận yêu cầu đặt cọc của bạn.'
            : state === 'cancel'
                ? 'Bạn có thể quay lại trang phòng để thực hiện đặt cọc lại khi cần.'
                : verifyError
                    ? `Không thể xác minh tự động: ${verifyError}. Kết quả thanh toán có thể đang chờ đồng bộ.`
                    : 'Kết quả thanh toán đang được đồng bộ. Bạn có thể kiểm tra lại trong giây lát.';

    return (
        <main className="min-h-screen bg-background flex items-center justify-center px-4">
            <section className="w-full max-w-xl rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
                <h1 className="text-2xl font-bold text-foreground mb-3">{title}</h1>
                <p className="text-muted-foreground mb-6">{description}</p>

                {preorderId && (
                    <p className="text-sm text-muted-foreground mb-6">
                        Mã preorder: <span className="font-medium text-foreground">{preorderId}</span>
                    </p>
                )}

                {(verifying || verifyMessage) && (
                    <p className={`text-sm mb-6 ${verifiedSuccess ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {verifying ? 'Đang đồng bộ trạng thái thanh toán...' : verifyMessage}
                    </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {!verifying && (
                        <Link
                            to="/history"
                            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                        >
                            Xem lịch sử thuê
                        </Link>
                    )}
                    <Link
                        to="/profile"
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                    >
                        Xem đặt cọc của tôi
                    </Link>
                    <Link
                        to="/browse"
                        className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-foreground font-medium hover:bg-muted transition-colors"
                    >
                        Tìm phòng khác
                    </Link>
                </div>
            </section>
        </main>
    );
}
