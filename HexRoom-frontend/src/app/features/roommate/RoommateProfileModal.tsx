import { useState, useEffect } from 'react';
import {
    X,
    Loader2,
    Cigarette,
    PawPrint,
    Moon,
    Sparkles,
    Users,
    Volume2,
    UserCheck,
    Shield,
    Eye,
    UtensilsCrossed,
    AlertTriangle,
    Mail,
    Phone,
    MapPin,
    Banknote,
    Calendar,
    Home,
} from 'lucide-react';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import { getRoommateProfileRequest, type RoommatePublicProfile } from '@/lib/api';
import { money } from '@/lib/hexroom-api';

const AVATAR_PLACEHOLDER = '/avatar-facebook-mac-dinh.jpg';

/* ────────────────── helpers ────────────────── */

function boolLabel(val: boolean | null | undefined): string {
    if (val === true) return 'Có';
    if (val === false) return 'Không';
    return '—';
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
    if (value === null || value === undefined || value === '' || value === '—') return null;
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-xs hover:border-emerald-500/40 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wide leading-tight">
                    {label}
                </span>
                <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                    {value}
                </p>
            </div>
        </div>
    );
}

/* ────────────────── main modal ────────────────── */

interface RoommateProfileModalProps {
    userId: string | null;
    matchScore?: number;
    matchingTags?: string[];
    warningTags?: string[];
    onClose: () => void;
}

export function RoommateProfileModal({ userId, matchScore, matchingTags, warningTags, onClose }: RoommateProfileModalProps) {
    const [profile, setProfile] = useState<RoommatePublicProfile | null>(null);
    const [loading, setLoading] = useState(!!userId);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const r = await getRoommateProfileRequest(userId);
                setProfile(r.data);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Lỗi tải hồ sơ');
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, [userId]);

    if (!userId) return null;

    const L = profile?.lifestyle;
    const U = profile?.user;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Centered modal */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <div
                    className="relative w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 fade-in duration-200 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
                        <div className="flex items-center gap-2">
                            <Eye className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-heading text-lg font-bold text-slate-900">
                                Hồ sơ người tìm ở ghép
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Đóng"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto bg-white">
                        {loading && (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                            </div>
                        )}

                        {error && (
                            <div className="p-6 text-center">
                                <p className="text-rose-500 text-sm font-semibold">{error}</p>
                            </div>
                        )}

                        {profile && !loading && (
                            <div className="space-y-6 p-6">
                                {/* Profile Header Card */}
                                <div className="text-center space-y-2.5">
                                    <div className="relative inline-block mx-auto">
                                        <ImageWithFallback
                                            src={U?.avatarUrl || AVATAR_PLACEHOLDER}
                                            alt={U?.fullName || ''}
                                            className="w-24 h-24 rounded-full object-cover border-3 border-emerald-500 ring-4 ring-emerald-100 shadow-md"
                                        />
                                    </div>
                                    <div>
                                        <h2 className="font-heading text-xl font-extrabold text-slate-900">
                                            {U?.fullName}
                                        </h2>
                                        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                                            {U?.gender && (
                                                <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                                                    {U.gender}
                                                </span>
                                            )}
                                            {U?.email && (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <Mail className="w-3.5 h-3.5 text-emerald-600" />
                                                    {U.email}
                                                </span>
                                            )}
                                            {U?.phone && (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                                                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                                                    {U.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {matchScore != null && (
                                        <div className="space-y-1.5 pt-1">
                                            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full font-bold text-xs shadow-xs border ${
                                                matchScore >= 80
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : matchScore >= 60
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                                {matchScore}% phù hợp với bạn
                                            </span>
                                            {matchingTags && matchingTags.length > 0 && (
                                                <div className="flex flex-wrap justify-center gap-1 pt-1">
                                                    {matchingTags.map((tag, idx) => (
                                                        <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {warningTags?.map((tag, idx) => (
                                                        <span key={`w-${idx}`} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {U?.memberSince && (
                                        <p className="text-xs text-slate-400">
                                            Thành viên từ {new Date(U.memberSince).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                                        </p>
                                    )}
                                </div>

                                <div className="h-px bg-slate-100" />

                                {/* Tiêu chí tìm bạn cùng phòng */}
                                {(profile.preference || profile.profile) && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                            <Sparkles className="w-4 h-4 text-emerald-600" /> Tiêu chí tìm bạn cùng phòng
                                        </div>

                                        <div className="grid grid-cols-2 gap-2.5">
                                            {(profile.profile?.budgetMin != null || profile.preference?.budget_min != null) && (
                                                <InfoCard
                                                    icon={Banknote}
                                                    label="Ngân sách tìm phòng"
                                                    value={`${money(Number(profile.profile?.budgetMin ?? profile.preference?.budget_min ?? 0))} - ${money(Number(profile.profile?.budgetMax ?? profile.preference?.budget_max ?? 0))}`}
                                                />
                                            )}
                                            {(profile.profile?.city || profile.preference?.preferredLocation || (profile.preference?.preferred_districts && profile.preference.preferred_districts.length > 0)) && (
                                                <InfoCard
                                                    icon={MapPin}
                                                    label="Khu vực mong muốn"
                                                    value={profile.profile?.city || profile.preference?.preferredLocation || profile.preference?.preferred_districts?.join(', ')}
                                                />
                                            )}
                                            {profile.profile?.moveInDate && (
                                                <InfoCard
                                                    icon={Calendar}
                                                    label="Dự kiến chuyển vào"
                                                    value={new Date(profile.profile.moveInDate).toLocaleDateString('vi-VN')}
                                                />
                                            )}
                                            {profile.preference?.room_type && (
                                                <InfoCard
                                                    icon={Home}
                                                    label="Loại phòng"
                                                    value={profile.preference.room_type}
                                                />
                                            )}
                                        </div>

                                        {profile.preference?.must_have_amenities && profile.preference.must_have_amenities.length > 0 && (
                                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                                <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wide mb-1.5">
                                                    Tiện ích mong muốn:
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {profile.preference.must_have_amenities.map((am) => (
                                                        <span key={am} className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                                                            {am}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="h-px bg-slate-100" />

                                {/* Lifestyle Section */}
                                {L && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                            <UserCheck className="w-4 h-4 text-emerald-600" /> Phong cách sống & Thói quen
                                        </div>

                                        {/* 2-Column Grid of Distinct Cards */}
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <InfoCard icon={Cigarette} label="Hút thuốc" value={boolLabel(L.smoking)} />
                                            <InfoCard icon={PawPrint} label="Nuôi thú cưng" value={boolLabel(L.pets_allowed)} />
                                            <InfoCard icon={Moon} label="Lịch ngủ" value={L.sleep_schedule} />
                                            <InfoCard icon={UserCheck} label="Giao tiếp" value={L.social_level} />
                                            <InfoCard icon={Shield} label="Sạch sẽ" value={L.cleanliness} />
                                            <InfoCard icon={Volume2} label="Chịu ồn" value={L.noise_tolerance} />
                                            <InfoCard icon={Users} label="Khách đến chơi" value={L.guest_frequency} />
                                            <InfoCard icon={UtensilsCrossed} label="Nấu ăn" value={L.cooking_frequency} />
                                        </div>

                                        {/* Interests – Highlighted Card with Crisp Badges */}
                                        {L.interests.length > 0 && (
                                            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5">
                                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Sở thích cá nhân
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {L.interests.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-white text-slate-800 border border-slate-200 shadow-xs"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Deal-breakers – High Contrast Warning Card */}
                                        {L.deal_breakers && (
                                            <div className="mt-3 p-3.5 rounded-xl bg-rose-50/80 border-l-4 border-l-rose-500 border border-rose-200">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 uppercase tracking-wide mb-1.5">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Điều không chấp nhận (Deal-breakers)
                                                </div>
                                                <p className="text-xs font-medium text-slate-800 leading-relaxed pl-1">
                                                    {L.deal_breakers}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!L && (
                                    <div className="text-center py-6">
                                        <p className="text-sm text-slate-400 italic">Chưa cập nhật thông tin phong cách sống.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
