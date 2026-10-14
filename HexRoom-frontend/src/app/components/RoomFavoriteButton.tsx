import { HeartFilled, HeartOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useFavorites } from '@/app/context/useFavorites';
import type { FavoriteRoom } from '@/app/context/favorites-context';

type Props = {
    favoritePayload: FavoriteRoom;
    className?: string;
};

export function RoomFavoriteButton({ favoritePayload, className }: Props) {
    const { t } = useTranslation();
    const { isFavorite, addFavorite, removeFavorite } = useFavorites();
    const roomId = favoritePayload.id;
    const favorited = isFavorite(roomId);
    const HeartIcon = favorited ? HeartFilled : HeartOutlined;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (favorited) {
            removeFavorite(roomId);
        } else {
            addFavorite(favoritePayload);
        }
    };

    return (
        <Button
            type="default"
            shape="circle"
            size="middle"
            onClick={handleClick}
            className={
                className ??
                'bg-card border-border shadow-sm hover:shadow-md min-w-[40px] min-h-[40px] touch-manipulation'
            }
            icon={
                <HeartIcon
                    className={favorited ? 'text-accent' : ''}
                    style={favorited ? { color: 'var(--color-accent)' } : undefined}
                />
            }
            title={favorited ? t('listing.unfavorite') : t('listing.favorite')}
        />
    );
}
