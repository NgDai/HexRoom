import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Search, MapPin, ClipboardCheck, ReceiptText, Users, ArrowRight,
    House, ShieldCheck, Sparkles, Filter, CheckCircle2, ChevronRight,
    Banknote, Heart, ArrowUpRight, MessageCircle, Star, Film, Play, Pause, ChevronLeft
} from 'lucide-react';
import { Header, Footer } from './components';
import { request, money, type ApiRoom, type Page } from '@/lib/hexroom-api';
import { POPULAR_LOCATIONS, FILTER_ROOM_TYPES, FILTER_PRICE_PRESETS, FILTER_SIZE_PRESETS, FILTER_AMENITIES } from '@/lib/constants/room-filters';
import { getRoommateSuggestionsRequest, type RoommateSuggestionItem } from '@/lib/api';

const POPULAR_AREAS = [
    {
        district: 'Quận Bình Thạnh',
        city: 'Hồ Chí Minh',
        priceRange: '2.5 - 7.5 triệu',
        image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&auto=format&fit=crop&q=80',
        highlight: 'Gần nhiều trường ĐH lớn, sát Quận 1',
    },
    {
        district: 'Quận 7',
        city: 'Hồ Chí Minh',
        priceRange: '3.2 - 9.0 triệu',
        image: 'https://images.unsplash.com/photo-1502005229762-ee152da915ba?w=800&auto=format&fit=crop&q=80',
        highlight: 'Khu Phú Mỹ Hưng, không khí thoáng mát',
    },
    {
        district: 'Quận Cầu Giấy',
        city: 'Hà Nội',
        priceRange: '2.8 - 6.5 triệu',
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80',
        highlight: 'Thủ phủ sinh viên & các tòa nhà văn phòng',
    },
    {
        district: 'TP. Thủ Đức',
        city: 'Hồ Chí Minh',
        priceRange: '2.0 - 5.5 triệu',
        image: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&auto=format&fit=crop&q=80',
        highlight: 'Khu Làng Đại Học, Khu Công Nghệ Cao',
    },
];

const quickPrinciples = [
    {
        icon: ClipboardCheck,
        title: 'Kiểm định tại chỗ 4 bước',
        text: 'Đối chiếu tình trạng thực tế, nội thất và thiết bị trước khi duyệt tin.'
    },
    {
        icon: ReceiptText,
        title: 'Minh bạch 100% phụ phí',
        text: 'Bảng kê chi tiết điện, nước, internet, gửi xe và quy tắc chia tiền cọc rõ ràng.'
    },
    {
        icon: Users,
        title: 'Ở ghép dựa trên phong cách',
        text: 'Tìm bạn cùng phòng hợp giờ ngủ, thói quen sạch sẽ và độ tương thích cao.'
    },
];

export function HomePage() {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState('');
    const [selectedCity, setSelectedCity] = useState('Hồ Chí Minh');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedRoomType, setSelectedRoomType] = useState('');
    const [selectedPrice, setSelectedPrice] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [onlyVerified, setOnlyVerified] = useState(false);
    const [rooms, setRooms] = useState<ApiRoom[]>([]);
    const [roommateSeekers, setRoommateSeekers] = useState<RoommateSuggestionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSort, setActiveSort] = useState<'all' | 'cheap' | 'studio'>('all');
    const [heroIndex, setHeroIndex] = useState(0);
    const [isFilmPaused, setIsFilmPaused] = useState(false);

    useEffect(() => {
        let active = true;
        setLoading(true);
        request<Page<ApiRoom>>('/rooms?limit=12')
            .then(data => {
                if (active) {
                    setRooms(data?.items || []);
                }
            })
            .catch(() => {
                if (active) setRooms([]);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        getRoommateSuggestionsRequest(4)
            .then(res => {
                if (active && res.data) {
                    setRoommateSeekers(res.data);
                }
            })
            .catch(() => {
                if (active) setRoommateSeekers([]);
            });

        return () => { active = false; };
    }, []);

    const currentCityObj = POPULAR_LOCATIONS.find(c => c.name.toLowerCase() === selectedCity.toLowerCase());
    const availableDistricts = currentCityObj?.districts || [];

    const toggleAmenity = (name: string) => {
        setSelectedAmenities(prev =>
            prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
        );
    };

    const handleSearchSubmit = (event: FormEvent) => {
        event.preventDefault();
        const params = new URLSearchParams();
        if (keyword.trim()) params.set('keyword', keyword.trim());
        if (selectedCity) params.set('city', selectedCity);
        if (selectedDistrict) params.set('district', selectedDistrict);
        if (selectedRoomType) params.set('roomType', selectedRoomType);
        if (selectedPrice && selectedPrice !== 'any') {
            const p = FILTER_PRICE_PRESETS.find(x => x.id === selectedPrice);
            if (p?.min != null) params.set('minPrice', String(p.min));
            if (p?.max != null) params.set('maxPrice', String(p.max));
        }
        if (selectedSize && selectedSize !== 'any') {
            const s = FILTER_SIZE_PRESETS.find(x => x.id === selectedSize);
            if (s?.min != null) params.set('minSize', String(s.min));
            if (s?.max != null) params.set('maxSize', String(s.max));
        }
        if (selectedAmenities.length > 0) {
            params.set('amenities', selectedAmenities.join(','));
        }
        if (onlyVerified) {
            params.set('inspection', 'verified');
        }
        navigate(`/rooms?${params.toString()}`);
    };

    const displayedRooms = rooms.filter(room => {
        if (activeSort === 'cheap') return room.price <= 3500000;
        if (activeSort === 'studio') return room.roomType === 'STUDIO';
        return true;
    });

    // Auto-advance hero carousel every 4.5s
    useEffect(() => {
        if (rooms.length <= 1) return;
        const timer = setInterval(() => {
            setHeroIndex(prev => (prev + 1) % Math.min(rooms.length, 6));
        }, 4500);
        return () => clearInterval(timer);
    }, [rooms.length]);

    const heroRooms = rooms.slice(0, 6);
    const currentHero = heroRooms.length > 0 ? (heroRooms[heroIndex % heroRooms.length] || heroRooms[0]) : null;

    return (
        <div className="hx-page">
            <Header onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />

            <main>
                {/* ── HERO BANNER (WIDESCREEN PANORAMIC) ── */}
                <section className="hx-container hx-hero">
                    <div className="hx-hero-copy">
                        <span className="hx-eyebrow">
                            <span /> HỆ THỐNG THUÊ PHÒNG & TÌM BẠN Ở GHÉP THẾ HỆ MỚI
                        </span>
                        <h1>
                            Phòng trọ chuẩn xác.<br />
                            <em>Không lo chi phí ngầm.</em>
                        </h1>
                        <p>
                            Khám phá hàng ngàn phòng trọ, căn hộ mini và không gian coliving đã được xác minh thực tế.
                            Kết nối bạn cùng phòng văn minh, cùng tần số và minh bạch từng khoản chi phí.
                        </p>

                        {/* Enhanced Multi-Option Search & Filter Box */}
                        <form className="hx-hero-filter-container" onSubmit={handleSearchSubmit}>
                            {/* Row 1: Keyword search */}
                            <div className="hx-hero-filter-primary">
                                <Search size={20} color="#10B981" />
                                <label className="hx-sr-only" htmlFor="home-search">Từ khóa tìm phòng</label>
                                <input
                                    id="home-search"
                                    value={keyword}
                                    onChange={e => setKeyword(e.target.value)}
                                    placeholder="Tìm theo tên phòng, đường, trường đại học (ĐH Bách Khoa, RMIT, Cầu Giấy, Bình Thạnh...)"
                                />
                                <button className="hx-hero-submit-btn" type="submit">
                                    <Search size={16} /> Tìm phòng ngay
                                </button>
                            </div>

                            {/* Row 2: Select Dropdowns (City, District, Room Type, Price, Size) */}
                            <div className="hx-hero-filter-grid">
                                <div className="hx-hero-select-wrap">
                                    <label htmlFor="home-city">Thành phố</label>
                                    <select
                                        id="home-city"
                                        className="hx-hero-select"
                                        value={selectedCity}
                                        onChange={e => {
                                            setSelectedCity(e.target.value);
                                            setSelectedDistrict('');
                                        }}
                                    >
                                        <option value="">Tất cả thành phố</option>
                                        {POPULAR_LOCATIONS.map(c => (
                                            <option key={c.name} value={c.name}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="hx-hero-select-wrap">
                                    <label htmlFor="home-district">Quận / Huyện</label>
                                    <select
                                        id="home-district"
                                        className="hx-hero-select"
                                        value={selectedDistrict}
                                        onChange={e => setSelectedDistrict(e.target.value)}
                                    >
                                        <option value="">Tất cả quận / huyện</option>
                                        {availableDistricts.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="hx-hero-select-wrap">
                                    <label htmlFor="home-room-type">Loại hình phòng</label>
                                    <select
                                        id="home-room-type"
                                        className="hx-hero-select"
                                        value={selectedRoomType}
                                        onChange={e => setSelectedRoomType(e.target.value)}
                                    >
                                        {FILTER_ROOM_TYPES.map(rt => (
                                            <option key={rt.value} value={rt.value}>{rt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="hx-hero-select-wrap">
                                    <label htmlFor="home-price">Mức giá thuê</label>
                                    <select
                                        id="home-price"
                                        className="hx-hero-select"
                                        value={selectedPrice}
                                        onChange={e => setSelectedPrice(e.target.value)}
                                    >
                                        {FILTER_PRICE_PRESETS.map(p => (
                                            <option key={p.id} value={p.id}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="hx-hero-select-wrap">
                                    <label htmlFor="home-size">Diện tích</label>
                                    <select
                                        id="home-size"
                                        className="hx-hero-select"
                                        value={selectedSize}
                                        onChange={e => setSelectedSize(e.target.value)}
                                    >
                                        {FILTER_SIZE_PRESETS.map(s => (
                                            <option key={s.id} value={s.id}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Row 3: Verified Checkbox & Amenities pills */}
                            <div className="hx-hero-filter-actions">
                                <label className="hx-hero-filter-verified-toggle">
                                    <input
                                        type="checkbox"
                                        checked={onlyVerified}
                                        onChange={e => setOnlyVerified(e.target.checked)}
                                    />
                                    <ShieldCheck size={16} color="#059669" />
                                    <span>Chỉ hiện phòng đã kiểm định thực địa 100%</span>
                                </label>

                                <div className="hx-hero-amenity-tags">
                                    <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600, alignSelf: 'center' }}>Tiện ích:</span>
                                    {FILTER_AMENITIES.slice(0, 6).map(a => {
                                        const active = selectedAmenities.includes(a.name);
                                        return (
                                            <button
                                                key={a.id}
                                                type="button"
                                                className={`hx-hero-amenity-pill ${active ? 'active' : ''}`}
                                                onClick={() => toggleAmenity(a.name)}
                                            >
                                                <span>{a.icon}</span>
                                                <span>{a.name}</span>
                                                {active && <span>✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </form>

                        {/* Fast Tags */}
                        <div className="hx-search-hints">
                            <span style={{ fontWeight: 600 }}>Gợi ý nhanh:</span>
                            <Link to="/rooms?city=H%E1%BB%93+Ch%C3%AD+Minh">Hồ Chí Minh</Link>
                            <Link to="/rooms?city=H%C3%A0+N%E1%BB%99i">Hà Nội</Link>
                            <Link to="/rooms?maxPrice=3000000">Dưới 3 triệu</Link>
                            <Link to="/rooms?roomType=STUDIO">Căn hộ Studio</Link>
                            <Link to="/rooms?roomType=SHARED">Ở ghép Coliving</Link>
                            <Link to="/roommate">Tìm bạn cùng phòng</Link>
                        </div>

                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 12 }}>
                            <Link className="hx-text-link" to="/how-it-works">
                                <ShieldCheck size={18} /> Tìm hiểu quy trình kiểm định của HexRoom <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>

                    {/* Right Visual Card: Cinematic Hero Auto-Carousel */}
                    <div className="hx-hero-showcase" aria-label="Căn hộ studio xác minh thực tế">
                        <div className="hx-showcase-image-wrap">
                            <img
                                key={currentHero?.id || 'default-hero'}
                                src={currentHero?.images?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'}
                                alt={currentHero?.roomName || 'HexRoom'}
                                className="hx-showcase-image"
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80';
                                }}
                            />
                            <div className="hx-showcase-overlay" />

                            {/* Top Floating Badges */}
                            <div className="hx-showcase-top">
                                <span className="hx-showcase-tag">
                                    <MapPin size={13} /> {[currentHero?.district, currentHero?.city].filter(Boolean).join(', ') || 'Hồ Chí Minh & Hà Nội'}
                                </span>
                                <span className="hx-showcase-verified">
                                    <CheckCircle2 size={13} /> 100% ĐÃ ĐỐI CHIẾU
                                </span>
                            </div>

                            {/* Carousel Next/Prev Controls */}
                            {heroRooms.length > 1 && (
                                <>
                                    <div className="hx-hero-carousel-controls">
                                        <button
                                            type="button"
                                            className="hx-carousel-btn"
                                            onClick={() => setHeroIndex(prev => (prev - 1 + heroRooms.length) % heroRooms.length)}
                                            aria-label="Phòng trước"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            className="hx-carousel-btn"
                                            onClick={() => setHeroIndex(prev => (prev + 1) % heroRooms.length)}
                                            aria-label="Phòng tiếp theo"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>

                                    {/* Carousel Indicator Dots */}
                                    <div className="hx-carousel-dots">
                                        {heroRooms.map((r, i) => (
                                            <button
                                                key={r.id}
                                                type="button"
                                                className={`hx-carousel-dot ${i === (heroIndex % heroRooms.length) ? 'active' : ''}`}
                                                onClick={() => setHeroIndex(i)}
                                                aria-label={`Chuyển đến phòng ${i + 1}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Bottom Floating Glass Card */}
                            <Link to={currentHero ? `/room/${currentHero.id}` : '/rooms'} className="hx-showcase-card" style={{ textDecoration: 'none', display: 'block' }}>
                                <div className="hx-showcase-card-header">
                                    <div className="hx-showcase-price">
                                        <strong>{currentHero ? money(currentHero.price) : 'Giá tốt'}</strong>
                                        {currentHero && <span> / tháng</span>}
                                    </div>
                                    <span className="hx-showcase-area">
                                        {currentHero ? `${currentHero.sizeM2 ?? 35}m² · ${currentHero.roomType === 'STUDIO' ? 'Studio' : currentHero.roomType === 'SHARED' ? 'Ở ghép' : 'Khép kín'}` : 'Minh bạch 100%'}
                                    </span>
                                </div>

                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {currentHero?.roomName || currentHero?.rentalTitle || 'Không gian sống được kiểm định thực tế'}
                                </h3>

                                <div className="hx-showcase-metrics">
                                    <div className="hx-metric-item">
                                        <ClipboardCheck size={14} color="#10B981" />
                                        <span>Điện: {currentHero?.costs?.electricityPerKwh ? money(currentHero.costs.electricityPerKwh) + '/kWh' : '3.500đ/kWh'}</span>
                                    </div>
                                    <div className="hx-metric-item">
                                        <ReceiptText size={14} color="#10B981" />
                                        <span>Nước: {currentHero?.costs?.waterPerM3 ? money(currentHero.costs.waterPerM3) + '/m³' : '20.000đ/m³'}</span>
                                    </div>
                                    <div className="hx-metric-item">
                                        <ShieldCheck size={14} color="#10B981" />
                                        <span>Không phí ẩn</span>
                                    </div>
                                </div>

                                <div className="hx-showcase-guarantee" style={{ justifyContent: 'space-between' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Sparkles size={14} color="#059669" />
                                        Đã đối chiếu thực tế · Sẵn sàng đón khách
                                    </span>
                                    <span style={{ fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        Xem chi tiết <ArrowRight size={13} />
                                    </span>
                                </div>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ── CINEMATIC MOVIE REEL MARQUEE (LƯỚT QUA NHƯ PHIM) ── */}
                <section className="hx-film-strip-section" aria-label="Phòng trọ thịnh hành lướt qua như phim">
                    <div className="hx-film-strip-header">
                        <div>
                            <h2 className="hx-film-strip-title">
                                <Film size={20} color="#10B981" />
                                PHÒNG TRỌ THỊNH HÀNH HÔM NAY
                                <span>Trending Live</span>
                            </h2>
                            <p className="hx-film-strip-desc">
                                Lướt xem hình ảnh các căn phòng thực tế đã kiểm định — Tự động chuyển động liên tục như trailer phim điện ảnh
                            </p>
                        </div>

                        <div className="hx-film-strip-controls">
                            <button
                                type="button"
                                className="hx-film-ctrl-btn"
                                onClick={() => setIsFilmPaused(!isFilmPaused)}
                            >
                                {isFilmPaused ? <Play size={13} /> : <Pause size={13} />}
                                {isFilmPaused ? 'Tiếp tục lướt' : 'Tạm dừng lướt'}
                            </button>
                            <Link to="/rooms" className="hx-film-ctrl-btn hx-film-all-btn">
                                Xem tất cả phòng <ChevronRight size={14} />
                            </Link>
                        </div>
                    </div>

                    <div className="hx-film-marquee-wrap">
                        <div className={`hx-film-track ${isFilmPaused ? 'paused' : ''}`}>
                            {[...rooms, ...rooms].map((room, idx) => (
                                <Link
                                    key={`${room.id}-${idx}`}
                                    to={`/room/${room.id}`}
                                    className="hx-film-card"
                                >
                                    <img
                                        src={room.images?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000&auto=format&fit=crop&q=80'}
                                        alt={room.roomName}
                                        className="hx-film-card-img"
                                        loading="lazy"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000&auto=format&fit=crop&q=80';
                                        }}
                                    />
                                    <div className="hx-film-card-overlay" />

                                    <div className="hx-film-card-top">
                                        <span className="hx-film-rating">
                                            <Star size={11} fill="#FBBF24" color="#FBBF24" /> 4.9 ★
                                        </span>
                                        <span className="hx-film-verified">
                                            <CheckCircle2 size={11} /> ĐÃ ĐỐI CHIẾU
                                        </span>
                                    </div>

                                    <div className="hx-film-card-bottom">
                                        <span className="hx-film-price-tag">
                                            {money(room.price)} / tháng
                                        </span>
                                        <h3 className="hx-film-card-title">
                                            {room.roomName || room.rentalTitle}
                                        </h3>
                                        <div className="hx-film-card-loc">
                                            <span>{[room.district, room.city].filter(Boolean).join(', ') || 'TP.HCM'} · {room.sizeM2 ?? '—'}m²</span>
                                            <span className="hx-film-view-action">
                                                Xem phòng <ArrowRight size={12} />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── CORE PRINCIPLES (DISTINCT VALUE PROPOSITIONS BAND) ── */}
                <section className="hx-principles-band" aria-label="Giá trị cốt lõi của HexRoom">
                    <div className="hx-container">
                        <div className="hx-principles">
                            {quickPrinciples.map(({ icon: Icon, title, text }) => (
                                <div key={title} className="hx-principle-card">
                                    <div className="hx-principle-icon-box">
                                        <Icon size={24} />
                                    </div>
                                    <div className="hx-principle-body">
                                        <h3>{title}</h3>
                                        <p>{text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── PANORAMIC 3-COLUMN DASHBOARD (UTILIZES ENTIRE WIDESCREEN) ── */}
                <section className="hx-container hx-section">
                    <div className="hx-section-heading">
                        <div>
                            <span className="hx-eyebrow">KHÔNG GIAN ĐÃ XÁC MINH</span>
                            <h2>Phòng trọ & Bạn cùng phòng mới nhất</h2>
                            <p>Danh sách tin đăng đã kiểm tra đối chiếu trực tiếp. Xem chi tiết chi phí và bằng chứng trước khi hẹn xem phòng.</p>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                type="button"
                                className={`hx-outline-button ${activeSort === 'all' ? 'active' : ''}`}
                                style={activeSort === 'all' ? { background: '#ECFDF5', color: '#047857' } : {}}
                                onClick={() => setActiveSort('all')}
                            >
                                Tất cả phòng
                            </button>
                            <button
                                type="button"
                                className="hx-outline-button"
                                style={activeSort === 'cheap' ? { background: '#ECFDF5', color: '#047857' } : {}}
                                onClick={() => setActiveSort('cheap')}
                            >
                                Dưới 3.5 triệu
                            </button>
                            <button
                                type="button"
                                className="hx-outline-button"
                                style={activeSort === 'studio' ? { background: '#ECFDF5', color: '#047857' } : {}}
                                onClick={() => setActiveSort('studio')}
                            >
                                Studio cao cấp
                            </button>
                        </div>
                    </div>

                    <div className="hx-panoramic-layout">
                        {/* ── LEFT COLUMN: FAST FILTERS & HOT DISTRICTS ── */}
                        <aside className="hx-left-sidebar" aria-label="Bộ lọc nhanh">
                            <div className="hx-sidebar-widget" style={{ marginBottom: 20 }}>
                                <h3><Filter size={18} color="#10B981" /> Khu vực sôi động</h3>
                                <div className="hx-sidebar-chips">
                                    <Link to="/rooms?district=Qu%E1%BA%ADn+B%C3%ACnh+Th%E1%BA%A1nh" className="hx-filter-pill">
                                        <span>Bình Thạnh</span>
                                        <span className="hx-pill-count">248</span>
                                    </Link>
                                    <Link to="/rooms?district=Qu%E1%BA%ADn+7" className="hx-filter-pill">
                                        <span>Quận 7</span>
                                        <span className="hx-pill-count">186</span>
                                    </Link>
                                    <Link to="/rooms?district=Qu%E1%BA%ADn+C%E1%BA%A7u+Gi%E1%BA%A5y" className="hx-filter-pill">
                                        <span>Cầu Giấy</span>
                                        <span className="hx-pill-count">312</span>
                                    </Link>
                                    <Link to="/rooms?district=TP.+Th%E1%BB%A7+%C4%90%E1%BB%A9c" className="hx-filter-pill">
                                        <span>Thủ Đức</span>
                                        <span className="hx-pill-count">195</span>
                                    </Link>
                                    <Link to="/rooms?district=Qu%E1%BA%ADn+1" className="hx-filter-pill">
                                        <span>Quận 1</span>
                                        <span className="hx-pill-count">114</span>
                                    </Link>
                                    <Link to="/rooms?district=Qu%E1%BA%ADn+Nam+T%E1%BB%AB+Li%C3%AAm" className="hx-filter-pill">
                                        <span>Nam Từ Liêm</span>
                                        <span className="hx-pill-count">167</span>
                                    </Link>
                                </div>
                            </div>

                            <div className="hx-sidebar-widget" style={{ marginBottom: 20 }}>
                                <h3><Banknote size={18} color="#10B981" /> Mức giá thuê tháng</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <Link to="/rooms?maxPrice=2000000" className="hx-filter-pill" style={{ justifyContent: 'space-between' }}>
                                        <span>Dưới 2.0 triệu / tháng</span>
                                        <span>→</span>
                                    </Link>
                                    <Link to="/rooms?minPrice=2000000&maxPrice=4000000" className="hx-filter-pill" style={{ justifyContent: 'space-between' }}>
                                        <span>2.0 - 4.0 triệu / tháng</span>
                                        <span>→</span>
                                    </Link>
                                    <Link to="/rooms?minPrice=4000000&maxPrice=7000000" className="hx-filter-pill" style={{ justifyContent: 'space-between' }}>
                                        <span>4.0 - 7.0 triệu / tháng</span>
                                        <span>→</span>
                                    </Link>
                                    <Link to="/rooms?minPrice=7000000&maxPrice=12000000" className="hx-filter-pill" style={{ justifyContent: 'space-between' }}>
                                        <span>7.0 - 12.0 triệu / tháng</span>
                                        <span>→</span>
                                    </Link>
                                    <Link to="/rooms?minPrice=12000000" className="hx-filter-pill" style={{ justifyContent: 'space-between' }}>
                                        <span>Trên 12.0 triệu / tháng</span>
                                        <span>→</span>
                                    </Link>
                                </div>
                            </div>

                            <div className="hx-sidebar-widget" style={{ marginBottom: 20 }}>
                                <h3><House size={18} color="#10B981" /> Loại hình phòng trọ</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <Link to="/rooms?roomType=STUDIO" className="hx-filter-pill" style={{ justifyContent: 'space-between' }}>
                                        <span>Căn hộ Studio</span>
                                        <span>→</span>
                                    </Link>
                                    <Link to="/rooms?roomType=SINGLE" className="hx-filter-pill" style={{ justifyContent: 'space-between' }}>
                                        <span>Phòng đơn khép kín</span>
                                        <span>→</span>
                                    </Link>
                                    <Link to="/rooms?roomType=SHARED" className="hx-filter-pill" style={{ justifyContent: 'space-between' }}>
                                        <span>Ở ghép / Coliving</span>
                                        <span>→</span>
                                    </Link>
                                    <Link to="/rooms?roomType=APARTMENT" className="hx-filter-pill" style={{ justifyContent: 'space-between' }}>
                                        <span>Căn hộ mini / Chung cư</span>
                                        <span>→</span>
                                    </Link>
                                    <Link to="/rooms?roomType=WHOLE_HOUSE" className="hx-filter-pill" style={{ justifyContent: 'space-between' }}>
                                        <span>Nhà nguyên căn</span>
                                        <span>→</span>
                                    </Link>
                                </div>
                            </div>

                            <div className="hx-sidebar-widget" style={{ marginBottom: 20 }}>
                                <h3><Sparkles size={18} color="#10B981" /> Tiện nghi phổ biến</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {FILTER_AMENITIES.slice(0, 8).map(am => (
                                        <Link
                                            key={am.id}
                                            to={`/rooms?amenities=${encodeURIComponent(am.name)}`}
                                            className="hx-filter-pill"
                                            style={{ padding: '4px 10px', fontSize: 12 }}
                                        >
                                            <span>{am.icon} {am.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            <div className="hx-sidebar-widget" style={{ marginBottom: 20 }}>
                                <h3><MapPin size={18} color="#10B981" /> Diện tích không gian</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <Link to="/rooms?maxSize=20" className="hx-filter-pill" style={{ justifyContent: 'space-between' }}>
                                        <span>Dưới 20m²</span>
                                        <span>→</span>
                                    </Link>
                                    <Link to="/rooms?minSize=20&maxSize=30" className="hx-filter-pill" style={{ justifyContent: 'space-between' }}>
                                        <span>20 - 30m²</span>
                                        <span>→</span>
                                    </Link>
                                    <Link to="/rooms?minSize=30&maxSize=45" className="hx-filter-pill" style={{ justifyContent: 'space-between' }}>
                                        <span>30 - 45m²</span>
                                        <span>→</span>
                                    </Link>
                                    <Link to="/rooms?minSize=45" className="hx-filter-pill" style={{ justifyContent: 'space-between' }}>
                                        <span>Trên 45m²</span>
                                        <span>→</span>
                                    </Link>
                                </div>
                            </div>

                            <div className="hx-sidebar-widget" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
                                <h3 style={{ color: '#065F46' }}>
                                    <ShieldCheck size={20} color="#059669" /> Tiêu chuẩn HexRoom
                                </h3>
                                <ul style={{ paddingLeft: 18, margin: '8px 0 0', fontSize: 13, color: '#166534', lineHeight: 1.8 }}>
                                    <li>Không kê giá ảo khi dẫn khách</li>
                                    <li>Đầy đủ hình ảnh toilet, ban công</li>
                                    <li>Bảo vệ cọc khi phát hiện sai lệch</li>
                                </ul>
                                <Link to="/how-it-works" style={{ display: 'inline-block', marginTop: 12, fontSize: 13, fontWeight: 700, color: '#059669', textDecoration: 'none' }}>
                                    Xem quy trình kiểm định →
                                </Link>
                            </div>
                        </aside>

                        {/* ── CENTER COLUMN: VERIFIED ROOMS GRID ── */}
                        <div className="hx-center-content">
                            {loading ? (
                                <p role="status">Đang tải danh sách phòng...</p>
                            ) : displayedRooms.length === 0 ? (
                                <div className="hx-empty">
                                    <House size={36} color="#10B981" />
                                    <h3>Không có phòng phù hợp với bộ lọc hiện tại</h3>
                                    <p>Hãy thử chọn lại mức giá hoặc khám phá các khu vực lân cận.</p>
                                    <button className="hx-button" onClick={() => setActiveSort('all')}>Xem tất cả</button>
                                </div>
                            ) : (
                                <div className="hx-room-grid">
                                    {displayedRooms.slice(0, 6).map((room) => (
                                        <Link className="hx-room-card" key={room.id} to={`/room/${room.id}`}>
                                            <div className="hx-room-photo">
                                                {room.images && room.images[0] ? (
                                                    <img
                                                        src={room.images[0]}
                                                        alt={room.roomName}
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80';
                                                        }}
                                                    />
                                                ) : (
                                                    <span><House size={40} /> Ảnh đang cập nhật</span>
                                                )}
                                                <span className="hx-room-type">
                                                    {room.roomType === 'SHARED' ? 'Ở ghép' : room.roomType === 'STUDIO' ? 'Studio' : 'Cho thuê'}
                                                </span>
                                                <span className="hx-verified-pill">
                                                    <CheckCircle2 size={12} /> ĐÃ ĐỐI CHIẾU
                                                </span>
                                            </div>

                                            <div className="hx-room-info">
                                                <p>
                                                    <MapPin size={14} color="#059669" />
                                                    {[room.district, room.city].filter(Boolean).join(', ') || 'Chưa cung cấp khu vực'}
                                                </p>
                                                <h3>{room.roomName || room.rentalTitle}</h3>

                                                {room.amenities && room.amenities.length > 0 && (
                                                    <div className="hx-room-amenities">
                                                        {room.amenities.slice(0, 3).map(a => (
                                                            <span key={a} className="hx-room-amenity">{a}</span>
                                                        ))}
                                                        {room.amenities.length > 3 && (
                                                            <span className="hx-room-amenity">+{room.amenities.length - 3}</span>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="hx-room-pricing-row">
                                                    <strong>
                                                        {money(room.price)}
                                                        <small> / tháng</small>
                                                    </strong>
                                                    <span>{room.sizeM2 ?? '—'} m² · Tối đa {room.maxPeople} người</span>
                                                </div>

                                                <p className="hx-freshness">
                                                    <CheckCircle2 size={12} color="#10B981" />
                                                    {room.availabilityConfirmedAt
                                                        ? `Xác nhận còn phòng: ${new Date(room.availabilityConfirmedAt).toLocaleDateString('vi-VN')}`
                                                        : 'Chủ nhà đã xác nhận sẵn sàng đón khách'}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            <div style={{ textAlign: 'center', marginTop: 32 }}>
                                <Link className="hx-button" to="/rooms" style={{ minWidth: 220 }}>
                                    Khám phá thêm 400+ phòng trọ khác <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>

                        {/* ── RIGHT COLUMN: ROOMMATE SEEKERS FEED ── */}
                        <aside className="hx-right-sidebar" aria-label="Người đi tìm bạn ở ghép">
                            <div className="hx-sidebar-widget">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <h3>
                                        <Users size={18} color="#10B981" /> Tìm bạn ở ghép
                                    </h3>
                                    <Link to="/roommate" style={{ fontSize: 12, fontWeight: 700, color: '#059669', textDecoration: 'none' }}>
                                        Xem tất cả ({roommateSeekers.length}) →
                                    </Link>
                                </div>
                                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>
                                    Những người có phong cách sống văn minh đang tìm phòng cùng bạn:
                                </p>

                                <div>
                                    {roommateSeekers.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '24px 8px', color: '#64748B', fontSize: 13 }}>
                                            Chưa có hồ sơ tìm bạn ở ghép.
                                        </div>
                                    ) : (
                                        roommateSeekers.slice(0, 4).map((seeker) => {
                                            const user = seeker.user;
                                            const pref = seeker.preference;
                                            const life = seeker.lifestyle;
                                            return (
                                                <div key={user.id} className="hx-seeker-card">
                                                    <div className="hx-seeker-header">
                                                        <img
                                                            src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                                                            alt={user.fullName}
                                                            className="hx-seeker-avatar"
                                                            onError={(e) => {
                                                                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
                                                            }}
                                                        />
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                <h4 className="hx-seeker-name">{user.fullName}</h4>
                                                                {seeker.matchScore > 0 && (
                                                                    <span className="hx-match-badge">
                                                                        <Sparkles size={11} /> {seeker.matchScore}%
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="hx-seeker-meta">
                                                                {user.gender || 'Thành viên'} {pref?.preferredLocation ? `· ${pref.preferredLocation}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {(pref?.budget_min != null || pref?.budget_max != null) && (
                                                        <div className="hx-seeker-budget">
                                                            <Banknote size={14} /> Ngân sách: {money(pref.budget_min ?? 0)} - {money(pref.budget_max ?? 0)}
                                                        </div>
                                                    )}

                                                    <div className="hx-seeker-tags">
                                                        {life?.sleep_schedule && <span className="hx-seeker-tag">{life.sleep_schedule}</span>}
                                                        {life?.cleanliness && <span className="hx-seeker-tag">{life.cleanliness}</span>}
                                                        {life?.smoking === false && (
                                                            <span className="hx-seeker-tag" style={{ color: '#059669', background: '#ECFDF5' }}>Không hút thuốc</span>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                                        <Link
                                                            to={`/roommate?user=${user.id}`}
                                                            style={{
                                                                flex: 1,
                                                                textAlign: 'center',
                                                                padding: '7px 10px',
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                borderRadius: 8,
                                                                background: '#10B981',
                                                                color: '#fff',
                                                                textDecoration: 'none'
                                                            }}
                                                        >
                                                            Nhắn tin trao đổi
                                                        </Link>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <div style={{ background: '#F8FAF9', borderRadius: 14, padding: 16, border: '1px dashed #CBD5E1', textAlign: 'center', marginTop: 16 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 6px', color: '#1E293B' }}>
                                        Bạn đang tìm bạn cùng phòng?
                                    </h4>
                                    <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px' }}>
                                        Tạo hồ sơ tiêu chí trong 1 phút để nhận gợi ý kết nối chuẩn xác.
                                    </p>
                                    <Link to="/roommate" className="hx-outline-button" style={{ width: '100%', fontSize: 12, minHeight: 36 }}>
                                        Tạo hồ sơ ở ghép ngay
                                    </Link>
                                </div>
                            </div>
                        </aside>
                    </div>
                </section>

                {/* ── FULL-WIDTH SECTION: TOP POPULAR DISTRICTS ── */}
                <section className="hx-container hx-section" style={{ borderTop: '1px solid #E2E8F0', paddingTop: 56 }}>
                    <div className="hx-section-heading">
                        <div>
                            <span className="hx-eyebrow">ĐỊA ĐIỂM ĐƯỢC QUAN TÂM NHẤT</span>
                            <h2>Khu vực cho thuê sôi động</h2>
                            <p>Chọn địa điểm gần trường học, chỗ làm hoặc các tiện ích trung tâm.</p>
                        </div>
                        <Link to="/rooms" className="hx-outline-button">Xem tất cả địa bàn <ChevronRight size={16} /></Link>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                        {POPULAR_AREAS.map((area) => (
                            <Link
                                key={area.district}
                                to={`/rooms?district=${encodeURIComponent(area.district)}&city=${encodeURIComponent(area.city)}`}
                                style={{
                                    position: 'relative',
                                    height: 220,
                                    borderRadius: 18,
                                    overflow: 'hidden',
                                    textDecoration: 'none',
                                    color: '#fff',
                                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                                    display: 'block'
                                }}
                            >
                                <img
                                    src={area.image}
                                    alt={area.district}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    loading="lazy"
                                />
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)'
                                }} />
                                <div style={{ position: 'absolute', bottom: 18, left: 18, right: 18 }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>
                                        {area.district}
                                    </h3>
                                    <p style={{ fontSize: 12, opacity: 0.9, margin: '0 0 6px', color: '#D1FAE5' }}>
                                        {area.city} · {area.highlight}
                                    </p>
                                    <span style={{ fontSize: 11, background: 'rgba(16, 185, 129, 0.85)', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                                        Giá tb: {area.priceRange}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* ── CALLOUT PROMOTION ── */}
                <section className="hx-callout hx-container">
                    <div>
                        <span className="hx-eyebrow">HỢP TÁC CÙNG HEXROOM</span>
                        <h2>Bạn là chủ nhà hoặc có phòng cần cho thuê?</h2>
                        <p>
                            Tiếp cận hơn 50,000+ sinh viên và người đi làm văn minh. Chúng tôi hỗ trợ chụp ảnh hiện trạng,
                            đối chiếu danh mục và duyệt tin nhanh chóng trong 24 giờ.
                        </p>
                    </div>
                    <Link className="hx-button" to="/register" style={{ minWidth: 200 }}>
                        Đăng tin miễn phí <ArrowUpRight size={20} />
                    </Link>
                </section>
            </main>

            <Footer />
        </div>
    );
}
