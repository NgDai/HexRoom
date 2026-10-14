import { EnvironmentOutlined, StarFilled, HeartOutlined, HeartFilled } from '@ant-design/icons';
import { Button, Card, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import { useFavorites } from '@/app/context/useFavorites';

const { Title, Text } = Typography;

interface Listing {
    id: string;
    image: string;
    title: string;
    price: string;
    area: string;
    location: string;
    rating: number;
    verified: boolean;
}

interface ListingCardProps {
    listing: Listing;
    onClick?: (id: string) => void;
}

export function ListingCard({ listing, onClick }: ListingCardProps) {
    const { t } = useTranslation();
    const { isFavorite, addFavorite, removeFavorite } = useFavorites();
    const favorited = isFavorite(listing.id);

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (favorited) {
            removeFavorite(listing.id);
        } else {
            addFavorite({
                id: listing.id,
                name: listing.title,
                price: parseFloat(listing.price.replace(/[^0-9]/g, '')),
                area: parseFloat(listing.area),
                address: listing.location,
                image: listing.image,
                available: true,
            });
        }
    };

    const HeartIcon = favorited ? HeartFilled : HeartOutlined;

    return (
        <Card
            hoverable
            className="rounded-2xl overflow-hidden border-border hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-200 cursor-pointer [&_.ant-card-body]:!p-4 sm:[&_.ant-card-body]:!p-5 group/card"
            styles={{ body: { padding: 0 } }}
            onClick={() => onClick?.(listing.id)}
        >
            <div className="relative h-40 sm:h-48 overflow-hidden rounded-t-2xl -mx-[1px] -mt-[1px] mb-3 sm:mb-4">
                <ImageWithFallback
                    src={listing.image}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 flex gap-2">
                    <Button
                        type="default"
                        shape="circle"
                        size="middle"
                        onClick={handleFavoriteClick}
                        className="bg-card border-border shadow-sm hover:shadow-md min-w-[40px] min-h-[40px] touch-manipulation"
                        icon={<HeartIcon className={favorited ? 'text-accent' : ''} style={favorited ? { color: 'var(--color-accent)' } : undefined} />}
                        title={favorited ? t('listing.unfavorite') : t('listing.favorite')}
                    />
                    {listing.verified && (
                        <Tag color="primary" className="m-0 flex items-center gap-1.5 rounded-lg border-0">
                            {t('listing.verified')}
                        </Tag>
                    )}
                </div>
            </div>
            <Title level={5} className="!font-heading !mb-2 !mt-0 truncate">{listing.title}</Title>
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                <EnvironmentOutlined className="shrink-0" />
                <Text type="secondary" className="truncate block">{listing.location}</Text>
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <Text strong className="text-lg text-primary">{listing.price}</Text>
                    <Text type="secondary" className="text-sm">{t('listing.perMonth')}</Text>
                </div>
                <div className="flex items-center gap-1 text-sm">
                    <StarFilled className="text-accent" style={{ color: 'var(--color-accent)' }} />
                    <Text strong>{listing.rating}</Text>
                </div>
            </div>
            <Text type="secondary" className="text-sm block mt-2">{listing.area}</Text>
        </Card>
    );
}
