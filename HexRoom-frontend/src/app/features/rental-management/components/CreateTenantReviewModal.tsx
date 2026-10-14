import React from 'react';
import { X, Star } from 'lucide-react';

export interface CreateTenantReviewData {
  rating: number;
  paymentPunctualityRating?: number;
  propertyCareRating?: number;
  communicationRating?: number;
  comment: string;
}

interface CreateTenantReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTenantReviewData) => void;
  tenantName: string;
  isLoading?: boolean;
}

export function CreateTenantReviewModal({
  isOpen,
  onClose,
  onSubmit,
  tenantName,
  isLoading = false,
}: CreateTenantReviewModalProps) {
  const [rating, setRating] = React.useState(0);
  const [hoveredRating, setHoveredRating] = React.useState(0);
  const [paymentRating, setPaymentRating] = React.useState(0);
  const [propertyRating, setPropertyRating] = React.useState(0);
  const [communicationRating, setCommunicationRating] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [errors, setErrors] = React.useState<{
    rating?: string;
    comment?: string;
  }>({});

  const RATING_LABELS: { [key: number]: string } = {
    1: 'Rất không hài lòng',
    2: 'Không hài lòng',
    3: 'Bình thường',
    4: 'Hài lòng',
    5: 'Rất hài lòng',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: typeof errors = {};

    if (rating === 0) {
      newErrors.rating = 'Vui lòng chọn số sao đánh giá';
    }

    if (!comment.trim()) {
      newErrors.comment = 'Vui lòng nhập nhận xét của bạn';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit({
      rating,
      paymentPunctualityRating: paymentRating || undefined,
      propertyCareRating: propertyRating || undefined,
      communicationRating: communicationRating || undefined,
      comment,
    });
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    setPaymentRating(0);
    setPropertyRating(0);
    setCommunicationRating(0);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-135 my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-semibold">Đánh giá </h2>
            <p className="text-sm text-foreground/60 mt-0.5">{tenantName}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Rating */}
          <div className="space-y-2">
            <label className="text-sm text-foreground/80">
              Đánh giá tổng thể <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoveredRating || rating) ? 'fill-accent text-accent' : 'text-muted'
                    }`}
                  />
                </button>
              ))}
              {(hoveredRating > 0 || rating > 0) && (
                <span className="ml-2 text-sm text-foreground/70 font-medium">
                  {RATING_LABELS[hoveredRating || rating]}
                </span>
              )}
            </div>
            {errors.rating && <p className="text-xs text-destructive">{errors.rating}</p>}
          </div>

          {/* Criteria ratings */}
          <div className="space-y-3">
            <label className="text-sm text-foreground/80">Đánh giá chi tiết (tùy chọn)</label>
            <div className="space-y-2.5">
              {[
                { val: paymentRating, set: setPaymentRating, label: 'Thanh toán đúng hạn' },
                { val: propertyRating, set: setPropertyRating, label: 'Giữ gìn tài sản' },
                { val: communicationRating, set: setCommunicationRating, label: 'Giao tiếp' },
              ].map(({ val, set, label }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-foreground/70">{label}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => set(val === star ? 0 : star)}
                        className="p-0.5"
                      >
                        <Star
                          className={`w-5 h-5 ${star <= val ? 'fill-accent text-accent' : 'text-muted'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <label htmlFor="comment" className="text-sm text-foreground/80">
              Nhận xét chi tiết <span className="text-destructive">*</span>
            </label>
            <textarea
              id="comment"
              rows={4}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (errors.comment) {
                  setErrors({ ...errors, comment: undefined });
                }
              }}
              placeholder="Chia sẻ trải nghiệm của bạn với tenant này..."
              className={`w-full px-3 py-2 bg-background border rounded-lg resize-none focus:outline-none focus:ring-2 text-sm ${
                errors.comment
                  ? 'border-destructive focus:ring-destructive/20'
                  : 'border-border focus:ring-primary/20 focus:border-primary'
              }`}
            />
            <div className="flex justify-between text-xs text-foreground/50">
              {errors.comment ? (
                <span className="text-destructive">{errors.comment}</span>
              ) : (
                <span />
              )}
              <span>{comment.length} ký tự</span>
            </div>
          </div>

          {/* Info */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-foreground/70">
             Đánh giá sẽ được phê duyệt bởi ezroom trước khi hiển thị.
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
