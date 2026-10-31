import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, Banknote, ChevronDown, House, MapPin, Search, ShieldCheck, Users } from 'lucide-react';
import { Header, Footer } from './components';
import { request, money, type ApiRoom, type Page } from '@/lib/hexroom-api';
import { POPULAR_LOCATIONS, FILTER_PRICE_PRESETS } from '@/lib/constants/room-filters';
import './home.css';

const areas = [
    { name: 'Bình Thạnh', district: 'Quận Bình Thạnh', city: 'Hồ Chí Minh', caption: 'Gần trường, gần trung tâm', image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80' },
    { name: 'Quận 7', district: 'Quận 7', city: 'Hồ Chí Minh', caption: 'Một nhịp sống thư thái', image: 'https://images.unsplash.com/photo-1502005229762-ee152da915ba?auto=format&fit=crop&w=800&q=80' },
    { name: 'Cầu Giấy', district: 'Quận Cầu Giấy', city: 'Hà Nội', caption: 'Thuận tiện học tập, làm việc', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80' },
];
const shortcuts = [
    { to: '/rooms', title: 'Tìm một căn phòng', text: 'Vừa ngân sách, đúng vị trí.', icon: House },
    { to: '/roommate', title: 'Tìm bạn ở ghép', text: 'Chia sẻ không gian, hợp cách sống.', icon: Users },
    { to: '/how-it-works', title: 'Hiểu rõ trước khi thuê', text: 'Xem hiện trạng và các khoản phí.', icon: ShieldCheck },
];

export function HomePage() {
    const navigate = useNavigate();
    const [location, setLocation] = useState('');
    const [price, setPrice] = useState('');
    const [rooms, setRooms] = useState<ApiRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reload, setReload] = useState(0);
    const [category, setCategory] = useState('all');

    useEffect(() => {
        let active = true;
        request<Page<ApiRoom>>('/rooms?limit=12')
            .then(data => { if (active) setRooms(data?.items ?? []); })
            .catch(() => { if (active) setError(true); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [reload]);

    const search = (event: FormEvent) => {
        event.preventDefault();
        const params = new URLSearchParams();
        const [city, district] = location.split('|');
        if (city) params.set('city', city);
        if (district) params.set('district', district);
        const range = FILTER_PRICE_PRESETS.find(item => item.id === price);
        if (range?.min != null) params.set('minPrice', String(range.min));
        if (range?.max != null) params.set('maxPrice', String(range.max));
        navigate(`/rooms${params.size ? `?${params}` : ''}`);
    };
    const visibleRooms = rooms.filter(room => category === 'all' || (category === 'budget' ? room.price <= 3000000 : room.roomType === 'STUDIO')).slice(0, 8);

    return (
        <div className="hx-page home-page">
            <Header onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />
            <main id="main-content">
                <section className="home-hero" aria-labelledby="home-title">
                    <img className="home-hero-image" src="/images/home-room.jpg" alt="Căn phòng thoáng sáng với cửa sổ lớn, bàn ăn và góc nghỉ ngơi" fetchPriority="high" width={2400} height={1600} />
                    <div className="home-hero-shade" />
                    <div className="home-hero-content">
                        <span className="home-hero-kicker"><span /> TÌM CHỐN RIÊNG, SỐNG CHẤT RIÊNG</span>
                        <h1 id="home-title">Một căn phòng.<br /><span>Một khởi đầu mới.</span></h1>
                        <p>Không gian vừa ý. Mức giá vừa tầm.</p>
                        <form className="home-search" onSubmit={search} aria-label="Tìm phòng theo vị trí và giá tiền">
                            <div className="home-search-field">
                                <MapPin size={21} aria-hidden="true" />
                                <div>
                                    <label htmlFor="home-location">Vị trí</label>
                                    <select id="home-location" value={location} onChange={event => setLocation(event.target.value)}>
                                        <option value="">Bạn muốn sống ở đâu?</option>
                                        {POPULAR_LOCATIONS.map(city => <optgroup key={city.name} label={city.label}><option value={city.name}>{city.label} · Tất cả khu vực</option>{city.districts.map(district => <option key={district} value={`${city.name}|${district}`}>{district}, {city.label}</option>)}</optgroup>)}
                                    </select>
                                </div>
                                <ChevronDown size={16} aria-hidden="true" />
                            </div>
                            <div className="home-search-field home-search-price">
                                <Banknote size={21} aria-hidden="true" />
                                <div>
                                    <label htmlFor="home-budget">Giá tiền</label>
                                    <select id="home-budget" value={price} onChange={event => setPrice(event.target.value)}>
                                        <option value="">Ngân sách mỗi tháng</option>
                                        {FILTER_PRICE_PRESETS.filter(item => item.id !== 'any').map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                                    </select>
                                </div>
                                <ChevronDown size={16} aria-hidden="true" />
                            </div>
                            <button type="submit" className="home-search-button"><Search size={20} /> <span>Tìm phòng</span></button>
                        </form>
                        <div className="home-popular-links"><span>Khám phá:</span><Link to="/rooms?city=Hồ+Chí+Minh">Hồ Chí Minh</Link><Link to="/rooms?city=Hà+Nội">Hà Nội</Link><Link to="/rooms?city=Đà+Nẵng">Đà Nẵng</Link></div>
                    </div>
                    <div className="home-hero-bottom"><span>Không gian truyền cảm hứng · Ảnh minh họa</span><a href="#explore-rooms">Khám phá bên dưới <ArrowDown size={16} /></a></div>
                </section>
                <div className="home-shortcuts hx-container">{shortcuts.map(({ to, title, text, icon: Icon }, index) => <Link key={to} to={to} className="home-shortcut"><span className={`home-shortcut-icon tone-${index}`}><Icon size={22} /></span><div><h2>{title}</h2><p>{text}</p></div><ArrowUpRight size={19} /></Link>)}</div>
                <section id="explore-rooms" className="hx-container home-section" aria-labelledby="rooms-heading">
                    <div className="home-section-heading"><div><span className="home-kicker">KHÁM PHÁ KHÔNG GIAN</span><h2 id="rooms-heading">Căn phòng tiếp theo của bạn</h2></div><Link className="home-all-link" to="/rooms">Xem tất cả <ArrowUpRight size={18} /></Link></div>
                    <div className="home-filter-tabs" aria-label="Nhóm phòng">{[['all', 'Tất cả'], ['budget', 'Dưới 3 triệu'], ['STUDIO', 'Studio']].map(([value, label]) => <button type="button" key={value} aria-pressed={category === value} onClick={() => setCategory(value)} className={category === value ? 'is-active' : ''}>{label}</button>)}</div>
                    {loading ? <div className="home-room-grid" aria-label="Đang tải phòng" role="status">{Array.from({ length: 4 }, (_, i) => <div className="home-room-skeleton" key={i}><div /><span /><span /></div>)}</div>
                        : error ? <div className="hx-empty" role="alert"><House size={28} /><h3>Chưa tải được danh sách phòng</h3><button className="hx-outline-button" onClick={() => { setError(false); setLoading(true); setReload(value => value + 1); }}>Thử lại</button></div>
                            : visibleRooms.length === 0 ? <div className="hx-empty"><House size={28} /><h3>Chưa có phòng trong nhóm này</h3><Link className="hx-outline-button" to="/rooms">Khám phá thêm</Link></div>
                                : <div className="home-room-grid">{visibleRooms.map(room => (
                                    <Link to={`/room/${room.id}`} key={room.id} className="home-room-card">
                                        <div className="home-room-image"><img src={room.images?.[0] || '/room-placeholder.svg'} alt={room.roomName || 'Phòng cho thuê'} loading="lazy" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/room-placeholder.svg'; }} /><span>{room.roomType === 'STUDIO' ? 'Studio' : room.roomType === 'SHARED' ? 'Ở ghép' : 'Phòng cho thuê'}</span></div>
                                        <div className="home-room-body"><p className="home-room-location"><MapPin size={13} />{[room.district, room.city].filter(Boolean).join(', ') || 'Đang cập nhật vị trí'}</p><h3>{room.roomName || room.rentalTitle}</h3><div className="home-room-meta"><span>{room.sizeM2 ? `${room.sizeM2} m²` : 'Diện tích đang cập nhật'}</span>{room.maxPeople > 0 && <span>{room.maxPeople} người</span>}{room.amenities?.[0] && <span>{room.amenities[0]}</span>}</div><div className="home-room-price"><span><strong>{money(room.price)}</strong><small>/ tháng</small></span><span className="home-room-arrow"><ArrowUpRight size={18} /></span></div></div>
                                    </Link>
                                ))}</div>}
                </section>
                <section className="home-areas-section" aria-labelledby="areas-heading"><div className="hx-container home-section">
                    <div className="home-section-heading"><div><span className="home-kicker">CHỌN MỘT KHU VỰC</span><h2 id="areas-heading">Gần hơn với nhịp sống của bạn</h2></div><Link to="/rooms" className="home-all-link">Tất cả khu vực <ArrowUpRight size={18} /></Link></div>
                    <div className="home-area-grid">{areas.map(area => <Link key={area.name} to={`/rooms?${new URLSearchParams({ city: area.city, district: area.district })}`} className="home-area-card"><img src={area.image} alt={`Không gian gợi ý tại ${area.name}`} loading="lazy" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/home-room.jpg'; }} /><div><span>{area.city}</span><h3>{area.name}</h3><p>{area.caption}</p></div><span className="home-area-arrow"><ArrowUpRight size={22} /></span></Link>)}</div>
                </div></section>
                <section className="hx-container home-section" aria-labelledby="roommate-heading"><div className="home-roommate-banner"><div><span className="home-kicker">CÙNG NHAU, DỄ DÀNG HƠN</span><h2 id="roommate-heading">Chung một mái nhà.<br />Hợp một cách sống.</h2><p>Tìm người có ngân sách và thói quen phù hợp với bạn.</p><Link to="/roommate" className="hx-button">Tìm bạn ở ghép <ArrowRight size={17} /></Link></div><div className="home-roommate-art" aria-hidden="true"><div className="home-art-window"><div /><div /><div /><div /></div><div className="home-art-plant" /><div className="home-art-sofa"><span /><span /><span /></div><div className="home-art-rug" /><span className="home-art-label"><Users size={18} /> Không gian chung, chất riêng</span></div></div></section>
            </main>
            <Footer />
        </div>
    );
}
