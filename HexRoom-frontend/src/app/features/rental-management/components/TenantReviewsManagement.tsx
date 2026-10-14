import { useState } from 'react';
import {
  Star,
  MessageCircle,
  Send,
  Loader2,
  Search,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';


interface TenantReview {
  id: string;
  rating: number;
  paymentPunctualityRating: number | null;
  propertyCareRating: number | null;
  communicationRating: number | null;
  comment: string;
  reviewer: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  reviewee: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';
  createdAt: string;
  landlordReply?: string | null;
  repliedAt?: string | null;
  moderatorNote?: string | null;
}

interface TenantReviewCardProps {
  review: TenantReview;
  onReplyClick: (review: TenantReview) => void;
}

const AVATAR_PLACEHOLDER = '/avatar-facebook-mac-dinh.jpg';

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
}

function StarRating({ rating, size = 16 }: { rating: number | null; size?: number }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
        />
      ))}
      <span className="text-sm font-medium text-gray-700 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    APPROVED: 'bg-green-50 text-green-700 border-green-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
    HIDDEN: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  const icons = {
    PENDING: <Clock size={14} />,
    APPROVED: <CheckCircle size={14} />,
    REJECTED: <XCircle size={14} />,
    HIDDEN: <XCircle size={14} />,
  };

  const labels = {
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Từ chối',
    HIDDEN: 'Ẩn',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 w-fit ${
        styles[status as keyof typeof styles]
      }`}
    >
      {icons[status as keyof typeof icons]}
      {labels[status as keyof typeof labels]}
    </span>
  );
}

function TenantReviewCard({ review, onReplyClick }: TenantReviewCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 mb-4 bg-white hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
            <ImageWithFallback
              src={review.reviewee.avatarUrl || AVATAR_PLACEHOLDER}
              alt={review.reviewee.fullName}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{review.reviewee.fullName}</h4>
            <p className="text-xs text-gray-400">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <StatusBadge status={review.status} />
      </div>

      {/* Rating */}
      <div className="mb-4">
        <StarRating rating={review.rating} size={18} />
      </div>

      {/* Criteria Ratings */}
      {(review.paymentPunctualityRating ||
        review.propertyCareRating ||
        review.communicationRating) && (
        <div className="mb-4 grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-lg">
          {review.paymentPunctualityRating && (
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Thanh toán</div>
              <StarRating rating={review.paymentPunctualityRating} size={14} />
            </div>
          )}
          {review.propertyCareRating && (
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Giữ gìn</div>
              <StarRating rating={review.propertyCareRating} size={14} />
            </div>
          )}
          {review.communicationRating && (
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Giao tiếp</div>
              <StarRating rating={review.communicationRating} size={14} />
            </div>
          )}
        </div>
      )}

      {/* Comment */}
      {review.comment && (
        <p className="text-gray-700 text-sm mb-4 leading-relaxed">{review.comment}</p>
      )}

      {/* Landlord Reply */}
      {review.landlordReply && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <h5 className="font-medium text-blue-900 text-sm mb-2">Phản hồi của bạn</h5>
          <p className="text-blue-800 text-sm">{review.landlordReply}</p>
          <p className="text-xs text-blue-600 mt-1">{formatDate(review.repliedAt || '')}</p>
        </div>
      )}

      {/* Moderator Note (if rejected/hidden) */}
      {review.status !== 'APPROVED' && review.moderatorNote && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <h5 className="font-medium text-red-900 text-sm mb-2">Ghi chú từ quản trị</h5>
          <p className="text-red-800 text-sm">{review.moderatorNote}</p>
        </div>
      )}

      {/* Actions */}
      {review.status === 'APPROVED' && !review.landlordReply && (
        <button
          onClick={() => onReplyClick(review)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
        >
          <MessageCircle size={16} />
          Phản hồi
        </button>
      )}
    </div>
  );
}

interface TenantReviewsManagementProps {
  rentalPeriodId?: string;
  reviews?: TenantReview[];
  isLoading?: boolean;
  onReplySubmit?: (reviewId: string, content: string) => Promise<void>;
}

export function TenantReviewsManagement({
  reviews = [],
  isLoading = false,
  onReplySubmit,
}: TenantReviewsManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.reviewee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.comment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || review.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleReplySubmit = async (review: TenantReview) => {
    if (!replyContent.trim() || !onReplySubmit) return;

    setIsSubmittingReply(true);
    try {
      await onReplySubmit(review.id, replyContent);
      setReplyingTo(null);
      setReplyContent('');
    } catch (error) {
      console.error('Failed to submit reply:', error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên tenant hoặc nội dung..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <select
          value={filterStatus || ''}
          onChange={(e) => setFilterStatus(e.target.value || null)}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">Chờ duyệt</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="REJECTED">Từ chối</option>
          <option value="HIDDEN">Ẩn</option>
        </select>
      </div>

      {/* Review List */}
      {filteredReviews.length > 0 ? (
        <div>
          {filteredReviews.map((review) => (
            <div key={review.id}>
              {replyingTo === review.id ? (
                <div className="border border-gray-200 rounded-lg p-6 mb-4 bg-white">
                  {/* Reply Form */}
                  <h4 className="font-medium mb-3">
                    Phản hồi cho {review.reviewee.fullName}
                  </h4>
                  <textarea
                    rows={4}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Nhập phản hồi của bạn..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent('');
                      }}
                      disabled={isSubmittingReply}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => handleReplySubmit(review)}
                      disabled={isSubmittingReply || !replyContent.trim()}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmittingReply ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Gửi phản hồi
                    </button>
                  </div>
                </div>
              ) : (
                <TenantReviewCard
                  review={review}
                  onReplyClick={() => setReplyingTo(review.id)}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Star className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">Chưa có đánh giá tenant nào</p>
        </div>
      )}
    </div>
  );
}
