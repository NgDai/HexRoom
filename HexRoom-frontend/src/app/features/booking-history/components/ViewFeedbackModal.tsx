import { X, Star } from 'lucide-react';
import type { FeedbackStatus } from '../types';

interface ViewFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyName: string;
    rating: number;
    comment: string | null;
    cleanlinessRating?: number | null;
    locationRating?: number | null;
    valueRating?: number | null;
    landlordRating?: number | null;
    status: FeedbackStatus;
    moderatorNote?: string | null;
}

const STATUS_CONFIG: Record<FeedbackStatus, { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Đang chờ duyệt' },
    APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã công khai' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Bị từ chối' },
    HIDDEN: { bg: 'bg-muted', text: 'text-foreground/70', label: 'Đã ẩn' },
};

export function ViewFeedbackModal({
    isOpen,
    onClose,
    propertyName,
    rating,
    comment,
    cleanlinessRating,
    locationRating,
    valueRating,
    landlordRating,
    status,
    moderatorNote,
}: ViewFeedbackModalProps) {
    if (!isOpen) return null;

    const sc = STATUS_CONFIG[status] || STATUS_CONFIG.HIDDEN;
    const detailRatings = [
        { label: 'Sạch sẽ', val: cleanlinessRating },
        { label: 'Vị trí', val: locationRating },
        { label: 'Giá trị', val: valueRating },
        { label: 'Chủ trọ', val: landlordRating },
    ].filter((r) => r.val != null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 overflow-y-auto">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md my-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                        <h2 className="font-semibold">Xem đánh giá</h2>
                        <p className="text-sm text-foreground/60 mt-0.5">{propertyName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-muted transition-colors"
                        aria-label="Đóng"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${sc.bg} ${sc.text}`}>
                            {sc.label}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-6 h-6 ${star <= rating ? 'fill-accent text-accent' : 'text-muted'}`}
                                />
                            ))}
                        </div>
                        <span className="text-foreground/70">{rating}/5</span>
                    </div>

                    {comment && (
                        <div>
                            <p className="text-sm text-foreground/80 font-medium mb-1">Nhận xét</p>
                            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment}</p>
                        </div>
                    )}

                    {detailRatings.length > 0 && (
                        <div className="pt-2 border-t border-border">
                            <p className="text-sm text-foreground/70 mb-2">Đánh giá chi tiết</p>
                            <div className="flex flex-wrap gap-4">
                                {detailRatings.map(({ label, val }) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <span className="text-sm">{label}:</span>
                                        <span className="text-sm font-medium">{val}/5</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {status === 'REJECTED' && moderatorNote && (
                        <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                            <p className="text-sm font-medium text-destructive mb-1">Lý do từ chối</p>
                            <p className="text-sm text-foreground/80">{moderatorNote}</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-border">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2.5 border border-border rounded-lg hover:bg-muted"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
