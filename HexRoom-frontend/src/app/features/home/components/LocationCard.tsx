import { ImageWithFallback } from '@/app/components/ImageWithFallback';

interface Location {
    name: string;
    count: string;
    image: string;
}

interface LocationCardProps {
    location: Location;
    onClick?: (name: string) => void;
}

export function LocationCard({ location, onClick }: LocationCardProps) {
    return (
        <div
            onClick={() => onClick?.(location.name)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick?.(location.name)}
            className="relative h-48 rounded-2xl overflow-hidden group cursor-pointer shadow-sm border border-border hover:shadow-md transition-all"
        >
            <ImageWithFallback
                src={location.image}
                alt={location.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="font-heading font-semibold mb-1 text-orange-400">{location.name}</h3>
                <p className="text-white/90 text-sm">{location.count}</p>
            </div>
        </div>
    );
}
