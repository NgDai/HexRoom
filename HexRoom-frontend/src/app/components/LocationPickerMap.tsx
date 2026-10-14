import { useState, useCallback, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, Navigation, X } from 'lucide-react';
import { useGeolocation } from '@/app/hooks/useGeolocation';

interface LocationResult {
    display_name: string;
    lat: string;
    lon: string;
}

interface LocationPickerMapProps {
    /** Text address value */
    value: string;
    onChange: (address: string) => void;
    placeholder?: string;
}

export function LocationPickerMap({ value, onChange, placeholder }: LocationPickerMapProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<LocationResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [showMap, setShowMap] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { requestLocation, latitude, longitude, loading: geoLoading } = useGeolocation();

    // Sync external value → query input
    useEffect(() => { setQuery(value); }, [value]);

    // Debounced Nominatim search
    const search = useCallback((q: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!q.trim() || q.length < 3) { setResults([]); return; }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=vn&limit=5&addressdetails=1`,
                    { headers: { 'Accept-Language': 'vi' } }
                );
                const data: LocationResult[] = await res.json();
                setResults(data);
            } catch { setResults([]); }
            finally { setSearching(false); }
        }, 500);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setQuery(v);
        onChange(v);
        search(v);
    };

    const selectResult = (r: LocationResult) => {
        const lat = parseFloat(r.lat);
        const lon = parseFloat(r.lon);
        setQuery(r.display_name);
        onChange(r.display_name);
        setMapCoords({ lat, lon });
        setShowMap(true);
        setResults([]);
    };

    // Use device location → reverse geocode
    const handleUseMyLocation = () => {
        requestLocation();
    };

    useEffect(() => {
        if (latitude == null || longitude == null) return;
        setMapCoords({ lat: latitude, lon: longitude });
        setShowMap(true);
        // Reverse geocode
        fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'vi' } }
        )
            .then((r) => r.json())
            .then((data) => {
                if (data?.display_name) {
                    setQuery(data.display_name);
                    onChange(data.display_name);
                }
            })
            .catch(() => {});
    }, [latitude, longitude, onChange]);

    const mapSrc = mapCoords
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lon - 0.01},${mapCoords.lat - 0.01},${mapCoords.lon + 0.01},${mapCoords.lat + 0.01}&layer=mapnik&marker=${mapCoords.lat},${mapCoords.lon}`
        : null;

    return (
        <div className="space-y-2">
            {/* Search input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                    value={query}
                    onChange={handleInputChange}
                    placeholder={placeholder ?? 'Tìm địa điểm...'}
                    className="w-full pl-10 pr-10 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                {!searching && query && (
                    <button type="button" onClick={() => { setQuery(''); onChange(''); setResults([]); setShowMap(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Autocomplete results */}
            {results.length > 0 && (
                <ul className="border border-border rounded-xl bg-background shadow-md overflow-hidden divide-y divide-border">
                    {results.map((r, i) => (
                        <li key={i}>
                            <button type="button" onClick={() => selectResult(r)}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-start gap-2">
                                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                                <span className="line-clamp-2">{r.display_name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {/* Use my location button */}
            <button type="button" onClick={handleUseMyLocation} disabled={geoLoading}
                className="flex items-center gap-2 text-xs text-primary hover:underline disabled:opacity-50">
                {geoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                Dùng vị trí hiện tại của tôi
            </button>

            {/* OSM iframe map preview */}
            {showMap && mapSrc && (
                <div className="rounded-xl overflow-hidden border border-border">
                    <iframe
                        src={mapSrc}
                        width="100%"
                        height="220"
                        style={{ border: 0 }}
                        title="Bản đồ vị trí"
                        loading="lazy"
                    />
                </div>
            )}
        </div>
    );
}
