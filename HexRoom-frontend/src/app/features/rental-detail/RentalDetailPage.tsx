import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RentalDetail } from './components/RentalDetail';
import { Header, Footer } from '@/app/features/home/components';
import { getPublicRentalByIdRequest } from '@/lib/api';
import { getSupabasePublicUrl, filterOutDocuments } from '@/lib/supabase-urls';
import type { RentalDetailData } from './types';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';

function mapApiToRentalDetailData(
  api: {
    id: string;
    title?: string;
    description?: string | null;
    status?: string;
    location?: { address?: string; district?: string | null; city?: string | null } | null;
    images?: string[];
    owner?: { id?: string; fullName?: string; phone?: string | null; email?: string; avatarUrl?: string | null } | null;
    rooms?: Array<{
      id: string;
      room_name?: string | null;
      price?: number;
      size_m2?: number | null;
      images?: string[];
      amenities?: string[];
    }>;
    amenities?: string[];
  },
  t: (key: string) => string
): RentalDetailData {
  const location = api.location;
  const address = location
    ? [location.address, location.district, location.city].filter(Boolean).join(', ')
    : '';
  const rooms = api.rooms || [];

  // Convert image paths to full URLs and filter out documents
  const imageUrls = filterOutDocuments(api.images || []).map(img => getSupabasePublicUrl(img));

  return {
    id: api.id,
    title: api.title || t('rentalDetail.defaultRentalTitle'),
    description: api.description || '',
    summary: (api.description && api.description.slice(0, 200)) || api.title || t('rentalDetail.defaultRentalTitle'),
    availableRoom: rooms.length,
    status: (api.status as RentalDetailData['status']) || 'PENDING',
    address,
    totalRooms: rooms.length,
    images: imageUrls.length ? imageUrls : [PLACEHOLDER_IMAGE],
    amenities: Array.isArray(api.amenities) ? api.amenities : [],
    landlord: {
      id: api.owner?.id ?? '',
      name: api.owner?.fullName ?? t('rentalDetail.defaultLandlordName'),
      phone: api.owner?.phone ?? '',
      email: api.owner?.email ?? '',
      avatar: api.owner?.avatarUrl ?? '',
    },
    rooms: rooms.map((r) => ({
      id: r.id,
      title: r.room_name || t('rentalDetail.defaultRoomTitle'),
      price: typeof r.price === 'number' ? r.price : 0,
      area: r.size_m2 != null ? Number(r.size_m2) : 0,
      status: 'available' as const,
      images: Array.isArray(r.images) && r.images.length > 0
        ? filterOutDocuments(r.images).map(img => getSupabasePublicUrl(img))
        : undefined,
      amenities: Array.isArray(r.amenities) ? r.amenities : [],
    })),
  };
}

export function RentalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rental, setRental] = useState<RentalDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [lastFetchedId, setLastFetchedId] = useState<string>('');
  const loading = !!id && lastFetchedId !== id;

  const fetchRental = useCallback(async () => {
    if (!id) return;
    try {
      const res = await getPublicRentalByIdRequest(id);
      const raw = res?.data;
      if (!raw || typeof raw !== 'object') {
        setError(t('rentalDetail.invalidData'));
        setRental(null);
        return;
      }
      setRental(mapApiToRentalDetailData(raw, t));
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('rentalDetail.loadError');
      setError(msg);
      setRental(null);
      console.error('[RentalDetailPage]', id, e);
    } finally {
      setLastFetchedId(id);
    }
  }, [id, t]);

  useEffect(() => {
    fetchRental();
  }, [fetchRental]);

  const handleLogin = () => navigate('/login');
  const handleRegister = () => navigate('/register');

  const renderContent = () => {
    if (!id) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-muted-foreground">{t('rentalDetail.notFound')}</p>
          <button type="button" onClick={() => navigate('/browse')} className="text-primary font-medium hover:underline">
            {t('rentalDetail.viewAllRentals')}
          </button>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
        </div>
      );
    }

    if (error || !rental) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-muted-foreground">{error || t('rentalDetail.notFound')}</p>
          <button type="button" onClick={() => navigate('/browse')} className="text-primary font-medium hover:underline">
            {t('rentalDetail.viewAllRentals')}
          </button>
        </div>
      );
    }

    return (
      <RentalDetail
        rental={rental}
        onBack={() => navigate('/browse')}
        onViewRoom={(roomId) => navigate(`/room/${roomId}`)}
      />
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
