import React from 'react';
import { X, Star, AlertCircle } from 'lucide-react';
import { RATING_LABELS, PROFANITY_WORDS } from '../constants';
import type { ReviewData } from '../types';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ReviewData) => void;
    propertyName: string;
    existingRating?: number;
    existingComment?: string;
    existingCleanliness?: number;
    existingLocation?: number;
    existingValue?: number;
    existingLandlord?: number;
    isEditMode?: boolean;
}

export function ReviewModal({
    isOpen,
    onClose,
    onSubmit,
    propertyName,
    existingRating,
    existingComment,
    existingCleanliness,
    existingLocation,
    existingValue,
    existingLandlord,
    isEditMode = false,
}: ReviewModalProps) {
    const [rating, setRating] = React.useState(existingRating || 0);
    const [hoveredRating, setHoveredRating] = React.useState(0);
    const [comment, setComment] = React.useState(existingComment || '');
    const [cleanlinessRating, setCleanlinessRating] = React.useState(existingCleanliness || 0);
    const [locationRating, setLocationRating] = React.useState(existingLocation || 0);
    const [valueRating, setValueRating] = React.useState(existingValue || 0);
    const [landlordRating, setLandlordRating] = React.useState(existingLandlord || 0);
    const [errors, setErrors] = React.useState<{
        rating?: string;
        comment?: string;
        profanity?: string;
    }>({});

    const checkProfanity = (text: string): boolean => {
        const lowerText = text.toLowerCase();
        return PROFANITY_WORDS.some((word) => lowerText.includes(word));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: typeof errors = {};

        if (rating === 0) {
            newErrors.rating = 'Vui lòng chọn số sao đánh giá';
        }

        if (!comment.trim()) {
            newErrors.comment = 'Vui lòng nhập nhận xét của bạn';
        } else if (comment.trim().length < 20) {
            newErrors.comment = 'Nhận xét cần tối thiểu 20 ký tự';
        } else if (checkProfanity(comment)) {
            newErrors.profanity = 'Nhận xét chứa từ ngữ không phù hợp.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        onSubmit({
            rating,
            comment,
            cleanlinessRating: cleanlinessRating || undefined,
            locationRating: locationRating || undefined,
            valueRating: valueRating || undefined,
            landlordRating: landlordRating || undefined,
        });
        handleClose();
    };

    const handleClose = () => {
        setRating(existingRating || 0);
        setComment(existingComment || '');
        setCleanlinessRating(existingCleanliness || 0);
        setLocationRating(existingLocation || 0);
        setValueRating(existingValue || 0);
        setLandlordRating(existingLandlord || 0);
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 overflow-y-auto">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={handleClose}
            />

            <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-135 my-6 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                        <h2 className="font-semibold">
                            {isEditMode ? 'Chỉnh sửa đánh giá' : 'Viết đánh giá'}
                        </h2>
                        <p className="text-sm text-foreground/60 mt-0.5">{propertyName}</p>
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
                    {/* Profanity error */}
                    {errors.profanity && (
                        <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                            <p className="text-sm text-destructive">{errors.profanity}</p>
                        </div>
                    )}

                    {/* Rating */}
                    <div className="space-y-2">
                        <label className="text-sm text-foreground/80">
                            Đánh giá của bạn <span className="text-destructive">*</span>
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
                                        className={`w-8 h-8 ${star <= (hoveredRating || rating)
                                                ? 'fill-accent text-accent'
                                                : 'text-muted'
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
                        {errors.rating && (
                            <p className="text-xs text-destructive">{errors.rating}</p>
                        )}
                    </div>

                    {/* Detail ratings (optional) */}
                    <div className="space-y-3">
                        <label className="text-sm text-foreground/80">Đánh giá chi tiết (tùy chọn)</label>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { val: cleanlinessRating, set: setCleanlinessRating, label: 'Sạch sẽ' },
                                { val: locationRating, set: setLocationRating, label: 'Vị trí' },
                                { val: valueRating, set: setValueRating, label: 'Giá trị' },
                                { val: landlordRating, set: setLandlordRating, label: 'Chủ trọ' },
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
                                if (errors.comment || errors.profanity) {
                                    setErrors({ ...errors, comment: undefined, profanity: undefined });
                                }
                            }}
                            placeholder="Chia sẻ trải nghiệm của bạn..."
                            className={`w-full px-3 py-2 bg-background border rounded-lg resize-none focus:outline-none focus:ring-2 text-sm ${errors.comment || errors.profanity
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
                        💡 Đánh giá sẽ được phê duyệt bởi ezroom.
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-muted"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 shadow-sm"
                        >
                            {isEditMode ? 'Cập nhật' : 'Gửi đánh giá'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
