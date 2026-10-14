import { useNavigate } from 'react-router-dom';
import { Typography } from 'antd';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';

const { Title } = Typography;

interface PopularArea {
    district: string;
    city: string;
    count: number;
    image: string;
}

interface PopularAreasCardProps {
    area: PopularArea;
}

export function PopularAreasCard({ area }: PopularAreasCardProps) {
    const navigate = useNavigate();

    const handleClick = () => {
        const p = new URLSearchParams();
        // Only pass real district/city so browse page fetches full filtered list from API (not limited to home's 20 items)
        if (area.district && area.district !== 'N/A') p.set('district', area.district);
        if (area.city && area.city !== 'N/A') p.set('city', area.city);
        navigate(`/browse?${p.toString()}`);
    };

    return (
        <div
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()}
            className="relative h-44 sm:h-52 rounded-2xl overflow-hidden group cursor-pointer shadow-md border border-border hover:shadow-xl hover:scale-[1.02] active:scale-[0.99] transition-all duration-300"
        >
            <ImageWithFallback
                src={area.image}
                alt={area.district}
                crossOrigin="anonymous"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <Title
                    level={5}
                    className={`!mb-0 !font-heading drop-shadow-lg ${area.district === 'N/A' ? '!text-white' : '!text-amber-300'}`}
                >
                    {area.district}
                </Title>
                <span className="text-white/90 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0">→</span>
            </div>
        </div>
    );
}
