import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header, Footer } from '@/app/features/home/components';
import { getLandlordProfileRequest } from '@/lib/api';
import type { LandlordProfileResponse } from '@/lib/api';
import { LandlordProfileHeader } from './components/LandlordProfileHeader';
import { LandlordRentalList } from './components/LandlordRentalList';
import { LandlordReviews } from './components/LandlordReviews';

type LandlordData = LandlordProfileResponse['data'];

export function ViewLandlordPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<LandlordData | null>(null);
    const [loading, setLoading] = useState(!!id);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await getLandlordProfileRequest(id);
                if (!res?.data) {
                    setError('Dữ liệu không hợp lệ');
                    return;
                }
                setData(res.data);
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Không thể tải hồ sơ chủ nhà';
                setError(msg);
                console.error('[ViewLandlordPage]', id, e);
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, [id]);

    const handleLogin = () => navigate('/login');
    const handleRegister = () => navigate('/register');

    const renderContent = () => {
        if (!id) {
            return (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <p className="text-muted-foreground text-lg">Thiếu ID chủ nhà</p>
                    <button
                        type="button"
                        onClick={() => navigate('/browse')}
                        className="text-primary font-medium hover:underline"
                    >
                        Xem tất cả nhà trọ
                    </button>
                </div>
            );
        }

        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin w-10 h-10 border-3 border-primary border-t-transparent rounded-full mb-3" />
                    <p className="text-muted-foreground animate-pulse">Đang tải hồ sơ chủ nhà...</p>
                </div>
            );
        }

        if (error || !data) {
            return (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-2">
                        <span className="text-3xl">😔</span>
                    </div>
                    <p className="text-muted-foreground text-lg">
                        {error || 'Không tìm thấy chủ nhà'}
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/browse')}
                        className="text-primary font-medium hover:underline"
                    >
                        Quay lại trang chủ
                    </button>
                </div>
            );
        }

        return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                <LandlordProfileHeader landlordId={id!} user={data.user} stats={data.stats} />
                <LandlordRentalList
                    rentals={data.rentals}
                    rooms={data.rooms}
                    stats={data.stats}
                />
                <LandlordReviews
                    reviews={data.reviews}
                    avgRating={data.stats.avgRating}
                    totalReviews={data.stats.totalReviews}
                />
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background">
            <Header onLogin={handleLogin} onRegister={handleRegister} />
            <main className="min-h-[60vh]">{renderContent()}</main>
            <Footer />
        </div>
    );
}
