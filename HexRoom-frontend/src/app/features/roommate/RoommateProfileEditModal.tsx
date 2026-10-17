import { useState, useEffect } from 'react';
import {
    X,
    Loader2,
    Sparkles,
    User,
    MapPin,
    Banknote,
    Calendar,
    Moon,
    Cigarette,
    PawPrint,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    Eye,
    EyeOff,
    Info,
} from 'lucide-react';
import { request, money } from '@/lib/hexroom-api';
import {
    upsertLifestyleRequest,
    upsertPreferenceRequest,
    updateProfileRequest,
    getLifestyleRequest,
    getPreferenceRequest,
} from '@/lib/api';
import { POPULAR_LOCATIONS } from '@/lib/constants/room-filters';

export interface RoommateProfileFormData {
    id?: string;
    nickname: string;
    city: string;
    districts?: string[];
    budgetMin: number;
    budgetMax: number;
    moveInDate: string;
    sleepSchedule: 'EARLY' | 'LATE' | 'FLEXIBLE';
    smoking: boolean;
    hasPets: boolean;
    acceptSmoking: boolean;
    acceptPets: boolean;
    visible: boolean;
    adultConfirmed: boolean;
    gender?: string;
    cleanliness?: string;
    social_level?: string;
    noise_tolerance?: string;
    deal_breakers?: string;
}

interface RoommateProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentProfile?: RoommateProfileFormData | null;
    userGender?: string | null;
}

export function RoommateProfileEditModal({
    isOpen,
    onClose,
    onSuccess,
    currentProfile,
    userGender,
}: RoommateProfileEditModalProps) {
    // Form fields
    const [nickname, setNickname] = useState('');
    const [gender, setGender] = useState(userGender || 'Nam');
    const [city, setCity] = useState('Hồ Chí Minh');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [budgetMin, setBudgetMin] = useState<number>(2000000);
    const [budgetMax, setBudgetMax] = useState<number>(4500000);
    const [moveInDate, setMoveInDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    });

    // Habits & Lifestyle
    const [sleepSchedule, setSleepSchedule] = useState<'EARLY' | 'LATE' | 'FLEXIBLE'>('EARLY');
    const [cleanliness, setCleanliness] = useState('Gọn gàng ngăn nắp');
    const [smoking, setSmoking] = useState(false);
    const [acceptSmoking, setAcceptSmoking] = useState(false);
    const [hasPets, setHasPets] = useState(false);
    const [acceptPets, setAcceptPets] = useState(true);
    const [socialLevel, setSocialLevel] = useState('Vừa phải, tôn trọng sự riêng tư');
    const [noiseTolerance, setNoiseTolerance] = useState('Bình thường');
    const [dealBreakers, setDealBreakers] = useState('');

    // Publication state
    const [visible, setVisible] = useState(true);
    const [adultConfirmed, setAdultConfirmed] = useState(true);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Populate existing profile when modal opens
    useEffect(() => {
        if (!isOpen) return;

        if (currentProfile) {
            setNickname(currentProfile.nickname || '');
            setCity(currentProfile.city || 'Hồ Chí Minh');
            setSelectedDistrict(currentProfile.districts?.[0] || '');
            setBudgetMin(Number(currentProfile.budgetMin) || 2000000);
            setBudgetMax(Number(currentProfile.budgetMax) || 4500000);
            setMoveInDate(currentProfile.moveInDate || new Date().toISOString().split('T')[0]);
            setSleepSchedule(currentProfile.sleepSchedule || 'EARLY');
            setSmoking(Boolean(currentProfile.smoking));
            setAcceptSmoking(Boolean(currentProfile.acceptSmoking));
            setHasPets(Boolean(currentProfile.hasPets));
            setAcceptPets(Boolean(currentProfile.acceptPets));
            setVisible(currentProfile.visible !== false);
            setAdultConfirmed(true);
            if (currentProfile.gender) setGender(currentProfile.gender);
            if (currentProfile.cleanliness) setCleanliness(currentProfile.cleanliness);
            if (currentProfile.social_level) setSocialLevel(currentProfile.social_level);
            if (currentProfile.noise_tolerance) setNoiseTolerance(currentProfile.noise_tolerance);
            if (currentProfile.deal_breakers) setDealBreakers(currentProfile.deal_breakers);
        } else {
            // Load from backend preference & lifestyle if available
            Promise.all([
                getPreferenceRequest().catch(() => null),
                getLifestyleRequest().catch(() => null),
            ]).then(([prefRes, lifeRes]) => {
                const pref = prefRes?.preference;
                const life = lifeRes?.profile;
                if (pref) {
                    if (pref.preferredLocation) setCity(pref.preferredLocation);
                    if (pref.preferred_districts?.[0]) setSelectedDistrict(pref.preferred_districts[0]);
                    if (pref.budget_min) setBudgetMin(Number(pref.budget_min));
                    if (pref.budget_max) setBudgetMax(Number(pref.budget_max));
                }
                if (life) {
                    if (life.smoking !== undefined && life.smoking !== null) setSmoking(Boolean(life.smoking));
                    if (life.pets_allowed !== undefined && life.pets_allowed !== null) setHasPets(Boolean(life.pets_allowed));
                    if (life.cleanliness) setCleanliness(life.cleanliness);
                    if (life.deal_breakers) setDealBreakers(life.deal_breakers);
                }
            });
        }
    }, [isOpen, currentProfile]);

    if (!isOpen) return null;

    const currentCityObj = POPULAR_LOCATIONS.find((c) => c.name.toLowerCase() === city.toLowerCase());
    const availableDistricts = currentCityObj?.districts || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!nickname.trim()) {
            setError('Vui lòng nhập biệt danh hiển thị.');
            return;
        }
        if (!city.trim()) {
            setError('Vui lòng chọn tỉnh / thành phố.');
            return;
        }
        if (!budgetMin || budgetMin < 0) {
            setError('Ngân sách tối thiểu không hợp lệ.');
            return;
        }
        if (!budgetMax || budgetMax <= 0 || budgetMin > budgetMax) {
            setError('Ngân sách tối đa phải lớn hơn ngân sách tối thiểu.');
            return;
        }
        if (!moveInDate) {
            setError('Vui lòng chọn ngày dự kiến chuyển vào.');
            return;
        }
        if (!adultConfirmed) {
            setError('Bạn cần xác nhận từ 18 tuổi trở lên để tham gia tìm bạn ở ghép.');
            return;
        }

        setLoading(true);

        try {
            // 1. Save RoommateProfile to backend
            const roommatePayload = {
                nickname: nickname.trim(),
                city: city.trim(),
                budgetMin: Number(budgetMin),
                budgetMax: Number(budgetMax),
                moveInDate,
                smoking,
                hasPets,
                acceptSmoking,
                acceptPets,
                visible,
                sleepSchedule,
                adultConfirmed: true,
            };

            await request('/roommates/profile', {
                method: 'PUT',
                body: JSON.stringify(roommatePayload),
            });

            // 2. Synchronize UserPreference in backend
            await upsertPreferenceRequest({
                budget_min: Number(budgetMin),
                budget_max: Number(budgetMax),
                preferredLocation: city,
                preferred_districts: selectedDistrict ? [selectedDistrict] : undefined,
                preferred_gender: gender === 'Nam' ? 'MALE' : gender === 'Nữ' ? 'FEMALE' : 'ANY',
                pet_friendly: acceptPets,
            }).catch(() => { });

            // 3. Synchronize LifestyleProfile in backend
            await upsertLifestyleRequest({
                smoking,
                pets_allowed: hasPets,
                sleep_schedule: sleepSchedule === 'EARLY' ? 'Ngủ sớm' : sleepSchedule === 'LATE' ? 'Ngủ muộn' : 'Linh hoạt',
                cleanliness,
                social_level: socialLevel,
                noise_tolerance: noiseTolerance,
                deal_breakers: dealBreakers.trim() || undefined,
            }).catch(() => { });

            // 4. Update gender in user profile if modified
            if (gender) {
                await updateProfileRequest({ gender }).catch(() => { });
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Không thể lưu hồ sơ. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl z-10 overflow-hidden my-8 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground font-heading">
                                {currentProfile ? 'Chỉnh sửa hồ sơ tìm bạn ở ghép' : 'Nhập hồ sơ & Đăng lên tìm bạn'}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Hoàn tất thông tin tiêu chí để xuất hiện trên sàn tìm bạn và nhận gợi ý phù hợp
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Đóng"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                    {error && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-sm flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* ── SECTION 1: THÔNG TIN CƠ BẢN ── */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                            <User className="w-4 h-4" />
                            <span>1. Thông tin cơ bản & Khu vực thuê</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5">
                                    Biệt danh / Tên hiển thị <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    maxLength={60}
                                    placeholder="VD: Tuấn HUTECH, Mai Phương..."
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <span className="text-[11px] text-muted-foreground mt-1 block">
                                    Không dùng số điện thoại hoặc địa chỉ làm biệt danh.
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5">
                                    Giới tính của bạn <span className="text-destructive">*</span>
                                </label>
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                >
                                    <option value="Nam">Nam</option>
                                    <option value="Nữ">Nữ</option>
                                    <option value="Khác">Khác</option>
                                </select>
                                <span className="text-[11px] text-muted-foreground mt-1 block">
                                    Dùng để lọc và ghép phòng cùng giới tính an toàn.
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-primary" />
                                    Tỉnh / Thành phố tìm phòng <span className="text-destructive">*</span>
                                </label>
                                <select
                                    value={city}
                                    onChange={(e) => {
                                        setCity(e.target.value);
                                        setSelectedDistrict('');
                                    }}
                                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                >
                                    {POPULAR_LOCATIONS.map((loc) => (
                                        <option key={loc.name} value={loc.name}>
                                            {loc.label}
                                        </option>
                                    ))}
                                    <option value="Khác">Tỉnh / Thành khác</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5">
                                    Quận / Huyện ưu tiên
                                </label>
                                {availableDistricts.length > 0 ? (
                                    <select
                                        value={selectedDistrict}
                                        onChange={(e) => setSelectedDistrict(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                    >
                                        <option value="">-- Tất cả quận huyện --</option>
                                        {availableDistricts.map((d) => (
                                            <option key={d} value={d}>
                                                {d}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="VD: Quận Bình Thạnh, Cầu Giấy..."
                                        value={selectedDistrict}
                                        onChange={(e) => setSelectedDistrict(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                                    <Banknote className="w-3.5 h-3.5 text-primary" />
                                    Ngân sách tối thiểu (VNĐ) <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    min={0}
                                    step={100000}
                                    value={budgetMin}
                                    onChange={(e) => setBudgetMin(Number(e.target.value))}
                                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                                />
                                <span className="text-[11px] text-muted-foreground mt-1 block">
                                    {money(budgetMin)}
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                                    <Banknote className="w-3.5 h-3.5 text-primary" />
                                    Ngân sách tối đa (VNĐ) <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    min={100000}
                                    step={100000}
                                    value={budgetMax}
                                    onChange={(e) => setBudgetMax(Number(e.target.value))}
                                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                                />
                                <span className="text-[11px] text-muted-foreground mt-1 block">
                                    {money(budgetMax)}
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-primary" />
                                    Ngày dự kiến vào ở <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={moveInDate}
                                    onChange={(e) => setMoveInDate(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── SECTION 2: THÓI QUEN SINH HOẠT & LỐI SỐNG ── */}
                    <div className="space-y-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                            <Moon className="w-4 h-4" />
                            <span>2. Thói quen sinh hoạt & Lối sống</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5">
                                    Lịch ngủ / Giờ giấc sinh hoạt <span className="text-destructive">*</span>
                                </label>
                                <select
                                    value={sleepSchedule}
                                    onChange={(e) => setSleepSchedule(e.target.value as any)}
                                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                >
                                    <option value="EARLY">🌅 Ngủ sớm (trước 23h, dậy sớm)</option>
                                    <option value="LATE">🌙 Cú đêm (ngủ sau 23h - 0h)</option>
                                    <option value="FLEXIBLE">⚡ Linh hoạt theo lịch học / làm việc</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5">
                                    Mức độ gọn gàng / sạch sẽ
                                </label>
                                <select
                                    value={cleanliness}
                                    onChange={(e) => setCleanliness(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                >
                                    <option value="Rất ngăn nắp, dọn dẹp hàng ngày">Rất ngăn nắp, dọn dẹp hàng ngày</option>
                                    <option value="Gọn gàng ngăn nắp">Gọn gàng, vệ sinh định kỳ</option>
                                    <option value="Thoải mái, linh hoạt">Thoải mái, không quá khắt khe</option>
                                </select>
                            </div>
                        </div>

                        {/* Smoking & Pets Matrix */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-muted/50 border border-border">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={smoking}
                                    onChange={(e) => setSmoking(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary/30"
                                />
                                <div className="flex items-center gap-2">
                                    <Cigarette className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium text-foreground">Tôi có hút thuốc</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={acceptSmoking}
                                    onChange={(e) => setAcceptSmoking(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary/30"
                                />
                                <span className="font-medium text-foreground">Chấp nhận bạn cùng phòng hút thuốc</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={hasPets}
                                    onChange={(e) => setHasPets(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary/30"
                                />
                                <div className="flex items-center gap-2">
                                    <PawPrint className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium text-foreground">Tôi có nuôi thú cưng</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={acceptPets}
                                    onChange={(e) => setAcceptPets(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary/30"
                                />
                                <span className="font-medium text-foreground">Chấp nhận bạn cùng phòng có thú cưng</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5">
                                    Mức độ giao tiếp / Tính cách
                                </label>
                                <select
                                    value={socialLevel}
                                    onChange={(e) => setSocialLevel(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                >
                                    <option value="Hướng nội, thích yên tĩnh">Hướng nội, thích yên tĩnh</option>
                                    <option value="Vừa phải, tôn trọng sự riêng tư">Vừa phải, tôn trọng sự riêng tư</option>
                                    <option value="Hướng ngoại, thích giao lưu trò chuyện">Hướng ngoại, thích giao lưu trò chuyện</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5">
                                    Độ chịu ồn khi nghỉ ngơi
                                </label>
                                <select
                                    value={noiseTolerance}
                                    onChange={(e) => setNoiseTolerance(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                >
                                    <option value="Cần yên tĩnh tuyệt đối">Cần yên tĩnh tuyệt đối</option>
                                    <option value="Bình thường">Bình thường</option>
                                    <option value="Thoải mái với tiếng ồn vừa phải">Thoải mái với tiếng ồn vừa phải</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-foreground mb-1.5">
                                Giới thiệu bản thân & Tiêu chí bạn cùng phòng mong muốn
                            </label>
                            <textarea
                                rows={3}
                                placeholder="VD: Mình là sinh viên năm 3, học từ sáng đến chiều. Muốn tìm bạn sạch sẽ, không hút thuốc, giữ trật tự sau 23h..."
                                value={dealBreakers}
                                onChange={(e) => setDealBreakers(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>
                    </div>

                    {/* ── SECTION 3: TRẠNG THÁI XUẤT BẢN & XÁC NHẬN ── */}
                    <div className="space-y-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                            <ShieldCheck className="w-4 h-4" />
                            <span>3. Đăng tin & Xác nhận</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={visible}
                                    onChange={(e) => setVisible(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary/30 mt-0.5"
                                />
                                <div>
                                    <span className="font-bold text-foreground block">
                                        Đăng hồ sơ lên mục Tìm bạn ở ghép (Hiển thị công khai)
                                    </span>
                                    <span className="text-xs text-muted-foreground block mt-0.5">
                                        Khi bật, hồ sơ tiêu chí của bạn sẽ xuất hiện trên danh sách để người khác có thể tìm thấy và gửi lời mời kết nối cùng phòng.
                                    </span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer select-none pt-2 border-t border-primary/10">
                                <input
                                    type="checkbox"
                                    required
                                    checked={adultConfirmed}
                                    onChange={(e) => setAdultConfirmed(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary/30 mt-0.5"
                                />
                                <div>
                                    <span className="font-semibold text-foreground text-xs block">
                                        Tôi xác nhận mình từ 18 tuổi trở lên <span className="text-destructive">*</span>
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-5 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground font-semibold text-sm transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Đang lưu...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>{visible ? 'Lưu & Đăng hồ sơ ngay' : 'Lưu hồ sơ (Tạm ẩn)'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
