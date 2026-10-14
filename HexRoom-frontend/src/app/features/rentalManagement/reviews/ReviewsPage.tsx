import { useState, useEffect } from 'react';
import { Star, MessageCircle, Send, Loader2, Search } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import { authFetch } from '@/lib/api';

interface Review {
    id: string;
    ratingOverall: number;
    cleanlinessRating: number | null;
    locationRating: number | null;
    valueRating: number | null;
    landlordRating: number | null;
    comment: string;
    reviewer: {
        id: string;
        fullName: string;
        avatarUrl: string | null;
    };
    room?: {
        id: string;
        room_name: string;
    };
    status: string;
    createdAt: string;
    landlordReply?: string | null;
    repliedAt?: string | null;
}

interface ReviewsResponse {
    success: boolean;
    data: {
        reviews: Review[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
    };
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

function StarRating({ rating }: { rating: number | null }) {
    if (!rating) return null;
    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star
                    key={i}
                    size={16}
                    className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                />
            ))}
            <span className="text-sm font-medium text-gray-700 ml-1">{rating.toFixed(1)}</span>
        </div>
    );
}

function ReviewCard({ review, onReplyClick }: { review: Review; onReplyClick: (review: Review) => void }) {
    return (
        <div className="border border-gray-200 rounded-lg p-6 mb-4 bg-white hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        <ImageWithFallback
                            src={review.reviewer.avatarUrl || AVATAR_PLACEHOLDER}
                            alt={review.reviewer.fullName}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-900">{review.reviewer.fullName}</h4>
                        {review.room && <p className="text-sm text-gray-500">{review.room.room_name}</p>}
                        <p className="text-xs text-gray-400">{formatDate(review.createdAt)}</p>
                    </div>
                </div>
                {review.room && (
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                        {review.room.room_name}
                    </span>
                )}
            </div>

            {/* Ratings */}
            <div className="mb-4">
                <div className="mb-2">
                    <p className="text-xs font-medium text-gray-600 mb-1">Đánh giá tổng thể</p>
                    <StarRating rating={review.ratingOverall} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    {review.cleanlinessRating && (
                        <div>
                            <p className="text-xs text-gray-600">Sạch sẽ</p>
                            <StarRating rating={review.cleanlinessRating} />
                        </div>
                    )}
                    {review.locationRating && (
                        <div>
                            <p className="text-xs text-gray-600">Vị trí</p>
                            <StarRating rating={review.locationRating} />
                        </div>
                    )}
                    {review.valueRating && (
                        <div>
                            <p className="text-xs text-gray-600">Giá trị</p>
                            <StarRating rating={review.valueRating} />
                        </div>
                    )}
                    {review.landlordRating && (
                        <div>
                            <p className="text-xs text-gray-600">Chủ nhà</p>
                            <StarRating rating={review.landlordRating} />
                        </div>
                    )}
                </div>
            </div>

            {/* Comment */}
            <p className="text-gray-700 text-sm mb-4 leading-relaxed">{review.comment}</p>

            {/* Landlord Reply */}
            {review.landlordReply ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-xs font-medium text-blue-900 mb-1">Phản hồi từ chủ nhà</p>
                    <p className="text-sm text-blue-800">{review.landlordReply}</p>
                    <p className="text-xs text-blue-600 mt-1">{formatDate(review.repliedAt || '')}</p>
                </div>
            ) : (
                <button
                    onClick={() => onReplyClick(review)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-2 mb-4"
                >
                    <MessageCircle size={16} /> Phản hồi
                </button>
            )}

            {/* Status Badge */}
            <div className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-1 rounded ${review.status === 'APPROVED' ? 'bg-green-50 text-green-700' :
                        review.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-red-50 text-red-700'
                    }`}>
                    {review.status === 'APPROVED' ? '✓ Đã duyệt' :
                        review.status === 'PENDING' ? '⏳ Chờ duyệt' :
                            '✕ Bị từ chối'}
                </span>
            </div>
        </div>
    );
}

function ReplyModal({
    review,
    onClose,
    onSubmit,
    isLoading,
}: {
    review: Review | null;
    onClose: () => void;
    onSubmit: (content: string) => Promise<void>;
    isLoading: boolean;
}) {
    const [content, setContent] = useState('');

    if (!review) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        await onSubmit(content);
        setContent('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg w-96 max-h-96 overflow-y-auto">
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Phản hồi đánh giá</h3>

                    <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-40 overflow-y-auto">
                        <p className="text-sm font-medium text-gray-900 mb-2">Đánh giá gốc:</p>
                        <p className="text-sm text-gray-700">{review.comment}</p>
                        <p className="text-xs text-gray-500 mt-2">- {review.reviewer.fullName}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phản hồi của bạn
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Cảm ơn bạn đã đánh giá..."
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                rows={4}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !content.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                Gửi
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export function ReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const limit = 10;
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [sortBy, setSortBy] = useState<'recent' | 'rating'>('recent');
    const [status, setStatus] = useState('APPROVED');
    const [search, setSearch] = useState('');
    const [replyingTo, setReplyingTo] = useState<Review | null>(null);
    const [replyLoading, setReplyLoading] = useState(false);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                status,
                sortBy,
            });

            const response = await authFetch(`/feedback/landlord/reviews?${params}`);
            if (!response.ok) throw new Error('Failed to fetch reviews');

            const data: ReviewsResponse = await response.json();
            if (data.success) {
                setReviews(data.data.reviews);
                setTotal(data.data.total);
                setHasMore(data.data.hasMore);
            }
        } catch (err) {
            console.error('Error fetching reviews:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
    }, [status, sortBy]);

    useEffect(() => {
        fetchReviews();
    }, [page, limit, status, sortBy]);

    const handleReply = async (content: string) => {
        if (!replyingTo) return;

        try {
            setReplyLoading(true);
            const response = await authFetch(`/feedback/${replyingTo.id}/reply`, {
                method: 'POST',
                body: JSON.stringify({ content }),
            });

            if (!response.ok) throw new Error('Failed to reply');

            const result = await response.json();
            if (result.success) {
                setReviews(
                    reviews.map((r) =>
                        r.id === replyingTo.id
                            ? { ...r, landlordReply: content, repliedAt: new Date().toISOString() }
                            : r
                    )
                );
                setReplyingTo(null);
            }
        } catch (err) {
            console.error('Error replying:', err);
        } finally {
            setReplyLoading(false);
        }
    };

    const filteredReviews = reviews.filter(
        (r) =>
            r.reviewer.fullName.toLowerCase().includes(search.toLowerCase()) ||
            r.comment.toLowerCase().includes(search.toLowerCase()) ||
            (r.room && r.room.room_name.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Đánh giá & Nhận xét</h1>
                <p className="text-gray-600 mt-1">Quản lý đánh giá từ khách thuê về phòng trọ của bạn</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                    <p className="text-sm text-blue-800 font-medium">Tổng số đánh giá</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{total}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                    <p className="text-sm text-green-800 font-medium">Đã duyệt</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">
                        {reviews.filter((r) => r.status === 'APPROVED').length}
                    </p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6">
                    <p className="text-sm text-yellow-800 font-medium">Chờ duyệt</p>
                    <p className="text-3xl font-bold text-yellow-900 mt-2">
                        {reviews.filter((r) => r.status === 'PENDING').length}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="space-y-4">
                <div className="flex gap-4 items-end flex-wrap">
                    <div className="flex-1 min-w-48">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Search size={16} className="inline mr-2" />
                            Tìm kiếm
                        </label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tên khách, phòng, nội dung..."
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="min-w-40">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="APPROVED">Đã duyệt</option>
                            <option value="PENDING">Chờ duyệt</option>
                            <option value="REJECTED">Bị từ chối</option>
                            <option value="HIDDEN">Ẩn</option>
                        </select>
                    </div>

                    <div className="min-w-40">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sắp xếp</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'recent' | 'rating')}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="recent">Mới nhất</option>
                            <option value="rating">Đánh giá cao nhất</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            <div>
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-600 font-medium">Chưa có đánh giá nào</p>
                        <p className="text-gray-500 text-sm">Đánh giá từ khách thuê sẽ hiển thị ở đây</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            {filteredReviews.map((review) => (
                                <ReviewCard
                                    key={review.id}
                                    review={review}
                                    onReplyClick={() => setReplyingTo(review)}
                                />
                            ))}
                        </div>

                        {/* Pagination */}
                        {hasMore || page > 1 ? (
                            <div className="flex items-center justify-between pt-6">
                                <p className="text-sm text-gray-600">
                                    Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)} từ {total}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Trước
                                    </button>
                                    <button
                                        onClick={() => setPage(page + 1)}
                                        disabled={!hasMore}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Tiếp
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </>
                )}
            </div>

            {/* Reply Modal */}
            <ReplyModal
                review={replyingTo}
                onClose={() => setReplyingTo(null)}
                onSubmit={handleReply}
                isLoading={replyLoading}
            />
        </div>
    );
}
