import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RoomDetail } from './components/RoomDetail';
import { getRoomByIdForSearchRoomateRequest } from '@/lib/api';
import type { RoomDetailData } from './types';
import { Header, Footer } from '@/app/features/home/components';

function RoomDetailShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
      <Footer />
    </div>
  );
}

function mapApiToRoomDetailData(api: Record<string, unknown>): RoomDetailData {
  const rental = (api.rental as { title?: string; location?: { address?: string; district?: string; city?: string }; owner?: { id?: string; fullName?: string; phone?: string; avatarUrl?: string } }) || {};
  const loc = rental.location;
  const address = loc ? [loc.address, loc.district, loc.city].filter(Boolean).join(', ') : '';
  const owner = rental.owner || {};
  const images = (api.images as string[]) || [];
  const amenities = Array.isArray(api.amenities)
    ? (api.amenities as { name?: string }[]).map((a) => (a && typeof a === 'object' && 'name' in a ? String(a.name) : '')).filter(Boolean)
    : [];

  const rawStatus = String(api.status ?? '').toUpperCase();
  const isNearlyAvailable = Boolean(api.isNearlyAvailable);
  const statusMap: Record<string, RoomDetailData['status']> = {
    AVAILABLE: 'available',
    RENTED: 'occupied',
    MAINTENANCE: 'maintenance',
    PENDING: 'available' as RoomDetailData['status'],
  };
  const status = isNearlyAvailable ? 'nearly_available' : (statusMap[rawStatus] ?? 'available');

  return {
    id: String(api.id ?? ''),
    title: String(api.roomName ?? api.title ?? 'Phòng'),

    description: String(api.description ?? ''),
    price: Number(api.price ?? 0),
    area: Number(api.sizeM2 ?? api.area ?? 0),
    max_occupants: Number(api.maxPeople ?? api.max_occupants ?? 1),
    status,
    availableFrom: (api.availableFrom as string | null) ?? null,
    daysUntilAvailable: (api.daysUntilAvailable as number | null) ?? null,
    address,
    images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
    amenities,
    rentalName: String(rental.title ?? 'Nhà trọ'),
    landlord: {
      id: String(owner.id ?? ''),
      name: String(owner.fullName ?? 'Chủ nhà'),
      phone: String(owner.phone ?? ''),
      email: '',
      avatar: String(owner.avatarUrl ?? ''),
    },
  };
}

export function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [room, setRoom] = useState<RoomDetailData | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    getRoomByIdForSearchRoomateRequest(id)
      .then((res) => setRoom(mapApiToRoomDetailData(res.data as Record<string, unknown>)))
      .catch((e) => setError(e instanceof Error ? e.message : t('roomDetail.loadError')))
      .finally(() => setLoading(false));
  }, [id, t]);

  if (!id) {
    return (
      <RoomDetailShell>
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <p className="text-muted-foreground">{t('roomDetail.notFound')}</p>
        </div>
      </RoomDetailShell>
    );
  }

  if (loading) {
    return (
      <RoomDetailShell>
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="animate-pulse text-muted-foreground">{t('roomDetail.loading')}</div>
        </div>
      </RoomDetailShell>
    );
  }

  if (error || !room) {
    return (
      <RoomDetailShell>
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <p className="text-muted-foreground">{error || t('roomDetail.notFound')}</p>
        </div>
      </RoomDetailShell>
    );
  }

  return (
    <RoomDetailShell>
      <RoomDetail room={room} onBack={() => navigate(-1)} />
    </RoomDetailShell>
  );
}
