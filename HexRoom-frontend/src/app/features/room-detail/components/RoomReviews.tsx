import { useEffect, useState } from 'react';
import { Star, User, MessageCircle } from 'lucide-react';
import { getRoomReviewsRequest } from '@/lib/api';

interface Review {
    id: string;
    rating: number;
    cleanlinessRating?: number;
    locationRating?: number;
    valueRating?: number;
    landlordRating?: number;
    comment: string;
    createdAt: string;
    author: {
        id: string;
        name: string;
        avatar?: string;
    };
    landlordReply?: string;
    repliedAt?: string;
}

interface RoomReviewsProps {
    roomId: string;
}

export function RoomReviews({ roomId }: RoomReviewsProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        averageRating: 0,
    });

    useEffect(() => {
        loadReviews();
    }, [roomId]);

    const loadReviews = async () => {
        try {
            setLoading(true);
            const result = await getRoomReviewsRequest(roomId, { page: 1, limit: 10 });
            setReviews(result.reviews || []);

            if (result.reviews && result.reviews.length > 0) {
                const avgRating = (result.reviews.reduce((sum, r) => sum + (r.rating || 0), 0)) / result.reviews.length;
                setStats({
                    total: result.total || 0,
                    averageRating: Math.round(avgRating * 10) / 10,
                });
            }
        } catch (err) {
            console.error('Failed to load room reviews:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-border p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                    <div className="h-20 bg-muted rounded"></div>
                </div>
            </div>
        );
    }

    if (!reviews || reviews.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-border p-6 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="font-nunito mb-2">Chưa có đánh giá</h3>
                <p className="text-sm text-muted-foreground">
                    Hãy là người đầu tiên đánh giá phòng này
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-border p-6">
            {/* Header */}
            <div className="mb-8">
                <h3 className="font-nunito text-lg mb-4">Đánh giá từ khách hàng</h3>

                <div className="flex items-start gap-8">
                    {/* Rating Summary */}
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-primary mb-2">
                                {stats.averageRating}
                            </div>
                            <div className="flex gap-1 justify-center mb-2">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`w-4 h-4 ${i < Math.round(stats.averageRating)
                                            ? 'fill-primary text-primary'
                                            : 'text-muted-foreground'
                                            }`}
                                    />
                                ))}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                ({stats.total} đánh giá)
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6 divide-y">
                {reviews.map((review) => (
                    <div key={review.id} className="pt-6 first:pt-0">
                        {/* Author Info */}
                        <div className="flex items-start gap-4 mb-4">
                            {review.author.avatar ? (
                                <img
                                    src={review.author.avatar}
                                    alt={review.author.name}
                                    crossOrigin="anonymous"
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <User className="w-5 h-5 text-primary" />
                                </div>
                            )}

                            <div className="flex-1">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <p className="font-medium text-foreground">
                                        {review.author.name}
                                    </p>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>

                                {/* Rating Stars */}
                                <div className="flex gap-1 mb-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-4 h-4 ${i < (review.rating || 0)
                                                ? 'fill-primary text-primary'
                                                : 'text-muted-foreground'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Rating Breakdown */}
                        {(review.cleanlinessRating || review.locationRating || review.valueRating || review.landlordRating) && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-xs bg-muted/50 p-3 rounded-lg">
                                {review.cleanlinessRating && (
                                    <div>
                                        <p className="text-muted-foreground mb-1">Sạch sẽ</p>
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-1.5 h-1.5 rounded-full ${i < (review.cleanlinessRating || 0)
                                                        ? 'bg-primary'
                                                        : 'bg-muted-foreground'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {review.locationRating && (
                                    <div>
                                        <p className="text-muted-foreground mb-1">Vị trí</p>
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-1.5 h-1.5 rounded-full ${i < (review.locationRating || 0)
                                                        ? 'bg-primary'
                                                        : 'bg-muted-foreground'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {review.valueRating && (
                                    <div>
                                        <p className="text-muted-foreground mb-1">Giá trị</p>
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-1.5 h-1.5 rounded-full ${i < (review.valueRating || 0)
                                                        ? 'bg-primary'
                                                        : 'bg-muted-foreground'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {review.landlordRating && (
                                    <div>
                                        <p className="text-muted-foreground mb-1">Chủ nhà</p>
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-1.5 h-1.5 rounded-full ${i < (review.landlordRating || 0)
                                                        ? 'bg-primary'
                                                        : 'bg-muted-foreground'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Comment */}
                        <p className="text-foreground leading-relaxed mb-4">
                            {review.comment}
                        </p>

                        {/* Landlord Reply */}
                        {review.landlordReply && (
                            <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mt-4">
                                <p className="text-sm font-medium text-accent mb-2">
                                    Phản hồi từ chủ nhà
                                </p>
                                <p className="text-sm text-foreground">
                                    {review.landlordReply}
                                </p>
                                {review.repliedAt && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {new Date(review.repliedAt).toLocaleDateString('vi-VN')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
