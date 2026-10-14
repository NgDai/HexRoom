import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/useAuth';
import { createTenantReviewRequest, authFetch } from '@/lib/api';
import { CreateTenantReviewModal, type CreateTenantReviewData } from './CreateTenantReviewModal';
import { TenantReviewsManagement } from './TenantReviewsManagement';
import { Star, Calendar, MapPin, User, Loader2, AlertCircle } from 'lucide-react';

interface CompletedRental {
  id: string;
  rental_period_id: string;
  tenant: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  room: {
    id: string;
    room_name: string;
  };
  startDate: string;
  endDate: string;
  hasReview: boolean;
  reviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';
}

interface TenantReviewDashboardProps {
  onRefresh?: () => void;
}

export function TenantReviewDashboard({ onRefresh }: TenantReviewDashboardProps) {
  const { user } = useAuth();
  const [completedRentals, setCompletedRentals] = useState<CompletedRental[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRental, setSelectedRental] = useState<CompletedRental | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  useEffect(() => {
    loadCompletedRentals();
  }, []);

  const loadCompletedRentals = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch completed rentals from API using authFetch for proper token handling
      const response = await authFetch('/tenant-reviews/completed-rentals');

      if (!response.ok) {
        throw new Error('Failed to load completed rentals');
      }

      const data = await response.json();
      setCompletedRentals(data.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Lỗi khi tải danh sách rental đã hoàn thành'
      );
      console.error('Error loading completed rentals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReview = (rental: CompletedRental) => {
    setSelectedRental(rental);
    setIsModalOpen(true);
  };

  const handleReviewSubmit = async (data: CreateTenantReviewData) => {
    if (!selectedRental) return;

    setIsSubmittingReview(true);
    setError(null);

    try {
      const response = await createTenantReviewRequest({
        rentalPeriodId: selectedRental.rental_period_id,
        ...data,
      });

      if (response.success) {
        // Close modal
        setIsModalOpen(false);
        setSelectedRental(null);

        // Reload data to refresh the list
        await loadCompletedRentals();

        if (onRefresh) {
          onRefresh();
        }
      } else {
        setError('Gửi đánh giá thất bại. Vui lòng thử lại.');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Lỗi khi gửi đánh giá'
      );
      console.error('Error submitting review:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const pendingReviews = completedRentals.filter((r) => !r.hasReview);
  const reviewHistory = completedRentals.filter((r) => r.hasReview);
  const reviewHistoryForDisplay = reviewHistory.map((r) => ({
    id: r.id,
    rating: 0,
    paymentPunctualityRating: null,
    propertyCareRating: null,
    communicationRating: null,
    comment: '',
    reviewer: {
      id: user?.id || '',
      fullName: user?.fullName || 'Chủ trọ',
      avatarUrl: user?.avatarUrl || null,
    },
    reviewee: {
      id: r.tenant.id,
      fullName: r.tenant.fullName,
      avatarUrl: r.tenant.avatarUrl,
    },
    status: (r.reviewStatus || 'PENDING') as 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN',
    createdAt: r.endDate || r.startDate,
    landlordReply: null,
    repliedAt: null,
    moderatorNote: null,
  }));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Đánh giá người thuê trọ</h1>
        <p className="text-gray-600 mt-1">
          Quản lý đánh giá của bạn về người thuê trọ sau khi hoàn thành hợp đồng
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Lỗi</h3>
            <p className="text-sm text-red-800 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'pending'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
        >
          Chờ đánh giá ({pendingReviews.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
        >
          Lịch sử ({reviewHistory.length})
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : activeTab === 'pending' ? (
        <div className="space-y-4">
          {pendingReviews.length > 0 ? (
            pendingReviews.map((rental) => (
              <div
                key={rental.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    {/* Tenant Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                      {rental.tenant.avatarUrl ? (
                        <img
                          src={rental.tenant.avatarUrl}
                          alt={rental.tenant.fullName}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-300">
                          <User className="w-6 h-6 text-gray-600" />
                        </div>
                      )}
                    </div>

                    {/* Rental Details */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{rental.tenant.fullName}</h3>
                      <div className="text-sm text-gray-600 space-y-1 mt-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {rental.room.room_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(rental.startDate)} - {formatDate(rental.endDate)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => handleCreateReview(rental)}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors whitespace-nowrap"
                  >
                    Viết đánh giá
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Star className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600">Không có người thuê nào chờ đánh giá</p>
            </div>
          )}
        </div>
      ) : (
        <TenantReviewsManagement reviews={reviewHistoryForDisplay} />
      )}

      {/* Review Modal */}
      {selectedRental && (
        <CreateTenantReviewModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRental(null);
          }}
          onSubmit={handleReviewSubmit}
          tenantName={selectedRental.tenant.fullName}
          isLoading={isSubmittingReview}
        />
      )}
    </div>
  );
}
