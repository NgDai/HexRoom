import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Building2,
  Wifi,
  Wind,
  Droplet,
  Car,
  Shield,
  Phone,
  Mail,
  Check,
  Bed,
  MessageCircle
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import { useFavorites } from '@/app/context/useFavorites';
import { useAuth } from '@/app/context/useAuth';
import { useChatBox } from '@/app/context/useChatBox';
import type { RentalDetailData } from '../types';

interface RentalDetailProps {
  rental: RentalDetailData;
  onBack: () => void;
  onViewRoom: (roomId: string) => void;
}

export function RentalDetail({ rental, onBack, onViewRoom }: RentalDetailProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const chatBox = useChatBox();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const [selectedImage, setSelectedImage] = useState(0);

  const handleContactRental = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Prevent landlord from chatting with themselves
    if (rental.landlord.id === user.id) {
      alert('Bạn không thể nhắn tin với chính mình');
      return;
    }
    if (chatBox && rental.landlord.id) {
      chatBox.openChatWith(rental.landlord.id);
    }
  };

  const handleRoomFavorite = (room: typeof rental.rooms[0]) => {
    if (isFavorite(room.id)) {
      removeFavorite(room.id);
    } else {
      addFavorite({
        id: room.id,
        name: room.title,
        price: room.price,
        area: room.area,
        address: rental.address,
        image: room.images?.[0] ?? '',
        available: room.status === 'available',
      });
    }
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    AVAILABLE: { label: t('rentalDetail.statusAvailable'), color: 'bg-primary text-primary-foreground' },
    UNAVAILABLE: { label: t('rentalDetail.statusUnavailable'), color: 'bg-muted text-muted-foreground' },
    HIDDEN: { label: t('rentalDetail.statusHidden'), color: 'bg-muted text-muted-foreground' },
    VIOLATE: { label: t('rentalDetail.statusViolate'), color: 'bg-destructive text-destructive-foreground' },
    PENDING: { label: t('rentalDetail.statusPending'), color: 'bg-accent text-accent-foreground' },
    SUSPEND: { label: t('rentalDetail.statusSuspend'), color: 'bg-muted text-muted-foreground' },
  };
  const statusInfo = statusConfig[rental.status] ?? statusConfig.PENDING;

  const amenityIcons: Record<string, typeof Check> = {
    'Wifi miễn phí': Wifi,
    'Wifi': Wifi,
    'Điều hòa': Wind,
    'Nóng lạnh': Droplet,
    'Bãi xe': Car,
    'An ninh 24/7': Shield,
    'An ninh': Shield,
  };
  const defaultPlaceholder = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 sm:gap-2 text-foreground hover:text-primary transition-colors min-h-[44px] -ml-1 pl-1 pr-2 touch-manipulation"
            >
              <ArrowLeft className="w-5 h-5 shrink-0" />
              <span className="text-sm sm:text-base">{t('rentalDetail.back')}</span>
            </button>

            <div className="flex items-center gap-1 sm:gap-3">
              <button className="p-2 rounded-lg hover:bg-muted transition-colors min-w-[44px] min-h-[44px] touch-manipulation">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Image Gallery – actual rental images */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="lg:col-span-2">
            <ImageWithFallback
              src={rental.images[selectedImage] || rental.images[0] || defaultPlaceholder}
              alt={rental.title}
              className="w-full h-48 sm:h-72 lg:h-96 object-cover rounded-xl"
            />
          </div>
          <div className="lg:col-span-2 grid grid-cols-4 gap-2 sm:gap-4">
            {(rental.images?.length ? rental.images : []).map((image, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedImage(index)}
                className={`relative overflow-hidden rounded-lg aspect-video transition-all duration-200 ${selectedImage === index ? 'ring-2 ring-primary ring-offset-2 shadow-md' : 'hover:ring-2 hover:ring-primary/50 opacity-80 hover:opacity-100'
                  }`}
              >
                <ImageWithFallback
                  src={image}
                  alt={t('rentalDetail.imageAlt', { n: index + 1 })}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Title & Status */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 mb-3">
                <h1 className="font-nunito text-lg sm:text-xl lg:text-2xl">{rental.title}</h1>
                <span className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm whitespace-nowrap shrink-0 w-fit ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <p>{rental.address}</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-primary/10 rounded-xl border border-primary/20 p-4 sm:p-6">
              <h3 className="font-nunito text-primary mb-2">{t('rentalDetail.summary')}</h3>
              <p className="text-foreground leading-relaxed">
                {rental.summary}
              </p>
            </div>

            {/* Key Info */}
            <div className="bg-white rounded-xl border border-border p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-2">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <p className="text-2xl font-semibold text-foreground">{rental.totalRooms}</p>
                  <p className="text-sm text-muted-foreground">{t('rentalDetail.totalRooms')}</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 text-accent mb-2">
                    <Bed className="w-6 h-6" />
                  </div>
                  <p className="text-2xl font-semibold text-accent">{rental.availableRoom}</p>
                  <p className="text-sm text-muted-foreground">{t('rentalDetail.availableRooms')}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl border border-border p-4 sm:p-6">
              <h3 className="font-nunito mb-4">{t('rentalDetail.description')}</h3>
              <p className="text-foreground leading-relaxed whitespace-pre-line">
                {rental.description}
              </p>
            </div>

            {/* Amenities – actual from DB (aggregated from rooms) */}
            {(rental.amenities?.length ?? 0) > 0 && (
              <div className="bg-white rounded-xl border border-border p-4 sm:p-6">
                <h3 className="font-nunito mb-3 sm:mb-4">{t('rentalDetail.amenities')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {rental.amenities.map((amenity, index) => {
                    const Icon = amenityIcons[amenity] || Check;
                    return (
                      <div key={`${amenity}-${index}`} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-foreground">{amenity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Rooms – actual room data with images */}
            <div className="bg-white rounded-xl border border-border p-4 sm:p-6">
              <h3 className="font-nunito mb-3 sm:mb-4">{t('rentalDetail.roomList')}</h3>
              <div className="space-y-4">
                {rental.rooms.map((room) => {
                  const roomImages = room.images?.length ? room.images : [];
                  const thumbSrc = roomImages[0] || defaultPlaceholder;
                  return (
                    <div
                      key={room.id}
                      className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <div className="flex-shrink-0 w-full sm:w-40 h-28 sm:h-32 rounded-lg overflow-hidden bg-muted">
                        <ImageWithFallback
                          src={thumbSrc}
                          alt={room.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground mb-1">{room.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-1">
                          <span>{room.area}m²</span>
                          <span className="h-1 w-1 bg-muted-foreground rounded-full" />
                          <span className={room.status === 'available' ? 'text-primary' : 'text-muted-foreground'}>
                            {room.status === 'available' ? t('rentalDetail.roomAvailable') : t('rentalDetail.roomRented')}
                          </span>
                        </div>
                        {(room.amenities?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(room.amenities ?? []).slice(0, 5).map((a, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {a}
                              </span>
                            ))}
                            {(room.amenities?.length ?? 0) > 5 && (
                              <span className="text-xs text-muted-foreground">+{(room.amenities?.length ?? 0) - 5}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 flex-shrink-0">
                        <div className="text-left sm:text-right">
                          <p className="text-base sm:text-lg font-semibold text-primary">
                            {Number(room.price).toLocaleString('vi-VN')} ₫
                          </p>
                          <p className="text-xs text-muted-foreground">{t('listing.perMonth')}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRoomFavorite(room)}
                            className="p-2.5 rounded-lg border border-border hover:bg-muted transition-colors min-h-[44px] touch-manipulation"
                            title={isFavorite(room.id) ? t('listing.unfavorite') : t('listing.favorite')}
                          >
                            <Heart
                              className={`w-5 h-5 ${isFavorite(room.id) ? 'fill-accent text-accent' : 'text-foreground'}`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => onViewRoom(room.id)}
                            disabled={room.status !== 'available'}
                            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg transition-colors min-h-[44px] touch-manipulation ${room.status === 'available'
                              ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                              : 'bg-muted text-muted-foreground cursor-not-allowed'
                              }`}
                          >
                            {room.status === 'available' ? t('rentalDetail.viewRoom') : t('rentalDetail.roomRentedBtn')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 order-first lg:order-none">
            <div className="lg:sticky lg:top-24 space-y-4 sm:space-y-6">
              {/* Availability Card */}
              <div className="bg-white rounded-xl border border-border p-4 sm:p-6 shadow-sm">
                <div className="text-center mb-6">
                  <p className="text-4xl font-bold text-accent mb-1">
                    {rental.availableRoom}
                  </p>
                  <p className="text-muted-foreground">{t('rentalDetail.availableRooms').toLowerCase()}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    / {rental.totalRooms} {t('rentalDetail.totalRooms').toLowerCase()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleContactRental}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg transition-colors min-h-[44px] touch-manipulation flex items-center justify-center gap-2 font-medium"
                >
                  <MessageCircle className="w-5 h-5" />
                  {user ? t('rentalDetail.contactRent') : t('auth.login', 'Đăng nhập')}
                </button>
              </div>

              {/* Landlord Info – actual owner from DB */}
              <div className="bg-white rounded-xl border border-border p-4 sm:p-6 shadow-sm">
                <h3 className="font-nunito mb-4">{t('rentalDetail.landlord')}</h3>

                <div className="flex items-center gap-3 mb-4">
                  <Link
                    to={`/landlord/${rental.landlord.id}`}
                    className="flex-shrink-0 hover:opacity-80 transition-opacity"
                  >
                    <ImageWithFallback
                      src={rental.landlord.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&fit=crop'}
                      alt={rental.landlord.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  </Link>
                  <div>
                    <p className="font-medium text-foreground">{rental.landlord.name || t('rentalDetail.landlordLabel')}</p>
                    <p className="text-sm text-muted-foreground">{t('rentalDetail.landlordLabel')}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {rental.landlord.phone && (
                    <a
                      href={`tel:${rental.landlord.phone}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Phone className="w-5 h-5 text-primary" />
                      <span className="text-foreground">{rental.landlord.phone}</span>
                    </a>
                  )}
                  {rental.landlord.email && (
                    <a
                      href={`mailto:${rental.landlord.email}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Mail className="w-5 h-5 text-primary" />
                      <span className="text-foreground text-sm break-all">{rental.landlord.email}</span>
                    </a>
                  )}
                  {!rental.landlord.phone && !rental.landlord.email && (
                    <p className="text-sm text-muted-foreground">{t('rentalDetail.contactViaMessage')}</p>
                  )}
                </div>
              </div>

              {/* Safety Notice */}
              <div className="bg-accent/10 rounded-xl border border-accent/20 p-4 sm:p-6">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-accent mb-1">{t('rentalDetail.safetyNote')}</p>
                    <p className="text-sm text-foreground/80">
                      {t('rentalDetail.safetyNoteDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
