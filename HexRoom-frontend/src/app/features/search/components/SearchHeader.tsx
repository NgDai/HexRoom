import { Link, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Heart } from 'lucide-react';
import { useFavorites } from '@/app/context/useFavorites';

interface SearchHeaderProps {
    title?: string;
    subtitle?: string;
}

export function SearchHeader({
    title = 'Tìm kiếm phòng trọ',
    subtitle = 'Tìm ngôi nhà lý tưởng cho bạn với công nghệ tìm kiếm thông minh',
}: SearchHeaderProps) {
    const navigate = useNavigate();
    const { favorites } = useFavorites();

    return (
        <header className="bg-card shadow-sm border-b border-border sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex items-center justify-between mb-5">
                    <Link to="/home" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                        <img src="/hexroom-logo.png" alt="HexRoom" className="w-8 h-8 object-contain shrink-0" />
                        <span className="font-heading font-bold text-primary">HexRoom</span>
                    </Link>
                    <button
                        type="button"
                        onClick={() => navigate('/favorites')}
                        className="relative p-2.5 hover:bg-muted rounded-xl transition-colors text-foreground hover:text-accent"
                        title="Phòng yêu thích"
                    >
                        <Heart className="w-5 h-5" strokeWidth={2} />
                        {favorites.length > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center font-semibold">
                                {favorites.length}
                            </span>
                        )}
                    </button>
                </div>
                <h1 className="font-heading text-center text-foreground">{title}</h1>
                <p className="text-center text-muted-foreground mt-2">{subtitle}</p>
            </div>
        </header>
    );
}
