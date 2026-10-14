import { useState } from 'react';
import { Avatar, Button, Empty, Rate, Typography } from 'antd';
import { StarFilled, UserOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface ReviewItem {
    id: string;
    rating: number | null;
    comment: string | null;
    createdAt: string;
    reviewer: { id: string; fullName: string; avatarUrl: string | null } | null;
}

interface LandlordReviewsProps {
    reviews: ReviewItem[];
    avgRating: number;
    totalReviews: number;
}

function getSatisfactionLabel(avg: number): string {
    if (avg >= 4.5) return 'Rất hài lòng';
    if (avg >= 3.5) return 'Hài lòng';
    if (avg >= 2.5) return 'Bình thường';
    if (avg >= 1.5) return 'Không hài lòng';
    return 'Rất không hài lòng';
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Hôm qua';
    if (days < 30) return `${days} ngày trước`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} tháng trước`;
    const years = Math.floor(months / 12);
    return `${years} năm trước`;
}

type FilterTab = 'all' | 'buyer' | 'seller';

export function LandlordReviews({ reviews, avgRating, totalReviews }: LandlordReviewsProps) {
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [showAll, setShowAll] = useState(false);

    const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

    const tabs: { key: FilterTab; label: string; count: number }[] = [
        { key: 'all', label: 'Tất cả', count: totalReviews },
        { key: 'buyer', label: 'Từ người thuê', count: totalReviews },
        { key: 'seller', label: 'Từ chủ nhà', count: 0 },
    ];

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-6">
            {/* Header */}
            <Title level={4} className="!mb-4 !mt-0 !font-heading">
                Đánh giá
            </Title>

            {totalReviews > 0 ? (
                <>
                    {/* Rating summary */}
                    <div className="flex items-start gap-6 mb-5">
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl px-5 py-4 text-center min-w-[130px]">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <span className="text-3xl font-bold text-foreground">{avgRating}</span>
                                <StarFilled className="text-amber-500 text-xl" />
                            </div>
                            <Text strong className="block text-sm text-foreground">
                                {getSatisfactionLabel(avgRating)}
                            </Text>
                            <Text type="secondary" className="block text-xs mt-0.5">
                                ({totalReviews} đánh giá theo người dùng)
                            </Text>
                        </div>
                        <div className="flex-1">
                            <Text strong className="block mb-2 text-sm">Người dùng đánh giá</Text>
                            {/* Rating breakdown bars */}
                            {[5, 4, 3, 2, 1].map((star) => {
                                const count = reviews.filter((r) => r.rating === star).length;
                                const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                return (
                                    <div key={star} className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-muted-foreground w-4 text-right">{star}</span>
                                        <StarFilled className="text-amber-500 text-xs" />
                                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground w-6">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <Text type="secondary" className="text-sm mr-1">Lọc đánh giá theo</Text>
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setActiveTab(t.key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeTab === t.key
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                            >
                                {t.label} ({t.count})
                            </button>
                        ))}
                    </div>

                    {/* Review list */}
                    <div className="space-y-4">
                        {displayedReviews.map((review) => (
                            <div
                                key={review.id}
                                className="border-b border-border pb-4 last:border-0 last:pb-0"
                            >
                                <div className="flex items-start gap-3">
                                    {review.reviewer?.avatarUrl ? (
                                        <Avatar src={review.reviewer.avatarUrl} size={40} />
                                    ) : (
                                        <Avatar icon={<UserOutlined />} size={40} className="bg-primary/10 text-primary" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Text strong className="text-sm">
                                                {review.reviewer?.fullName || 'Người dùng ẩn danh'}
                                            </Text>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Rate
                                                disabled
                                                value={review.rating || 0}
                                                className="text-sm [&_.ant-rate-star]:!mr-0.5"
                                            />
                                            <Text type="secondary" className="text-xs">
                                                • {timeAgo(review.createdAt)}
                                            </Text>
                                        </div>
                                        {review.comment && (
                                            <Text className="block mt-2 text-sm text-foreground leading-relaxed">
                                                {review.comment}
                                            </Text>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Show all button */}
                    {reviews.length > 3 && !showAll && (
                        <div className="text-center mt-4">
                            <Button
                                type="default"
                                onClick={() => setShowAll(true)}
                                className="rounded-full px-8 border-border hover:border-primary"
                            >
                                Xem tất cả {totalReviews} đánh giá
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <Empty description="Chưa có đánh giá nào" className="py-6" />
            )}
        </div>
    );
}
