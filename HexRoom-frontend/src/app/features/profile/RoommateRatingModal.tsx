import React, { useState } from 'react';
import { X, Star, Users } from 'lucide-react';
import { createRoommateRatingRequest } from '@/lib/api';

const RATING_LABELS = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'];

interface RoommateRatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    targetId: string;
    targetName: string;
    rentalPeriodId: string;
}

export function RoommateRatingModal({
    isOpen,
    onClose,
    onSuccess,
    targetId,
    targetName,
    rentalPeriodId,
}: RoommateRatingModalProps) {
    const [rating, setRating] = useState(0);
    const [hovered, setHovered] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClose = () => {
        setRating(0);
        setHovered(0);
        setComment('');
        setError(null);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) { setError('Vui lòng chọn số sao'); return; }
        setSubmitting(true);
        setError(null);
        try {
            await createRoommateRatingRequest({ targetId, rentalPeriodId, overallRating: rating, comment: comment.trim() || undefined });
            onSuccess();
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gửi đánh giá thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <div>
                            <h2 className="font-semibold text-sm">Trải nghiệm sống chung</h2>
                            <p className="text-xs text-muted-foreground">{targetName}</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm text-foreground/80">
                            Trải nghiệm sống chung <span className="text-destructive">*</span>
                        </label>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHovered(star)}
                                    onMouseLeave={() => setHovered(0)}
                                    className="transition-transform hover:scale-110"
                                >
                                    <Star className={`w-8 h-8 ${star <= (hovered || rating) ? 'fill-accent text-accent' : 'text-muted'}`} />
                                </button>
                            ))}
                            {(hovered > 0 || rating > 0) && (
                                <span className="ml-2 text-sm text-foreground/70 font-medium">
                                    {RATING_LABELS[hovered || rating]}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm text-foreground/80">Nhận xét (tùy chọn)</label>
                        <textarea
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Chia sẻ trải nghiệm sống chung với người này..."
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button type="button" onClick={handleClose}
                            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-muted">
                            Hủy
                        </button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-60 shadow-sm">
                            {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
