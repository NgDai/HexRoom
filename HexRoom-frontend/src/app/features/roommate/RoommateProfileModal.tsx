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
} from 'lucide-react';
import { ImageWithFallback } from '@/app/components/ImageWithFallback';
import { getRoommateProfileRequest, type RoommatePublicProfile } from '@/lib/api';
import { MOCK_SEEKERS_DATA } from '@/lib/mock-data';

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
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/70 shadow-xs hover:border-emerald-500/40 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40">
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wide leading-tight">
                    {label}
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
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
    onClose: () => void;
}

export function RoommateProfileModal({ userId, matchScore, onClose }: RoommateProfileModalProps) {
    const [profile, setProfile] = useState<RoommatePublicProfile | null>(null);
    const [loading, setLoading] = useState(!!userId);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            return;
        }

        const mockSeeker = MOCK_SEEKERS_DATA.find((s) => s.id === userId);
        if (mockSeeker) {
            setProfile({
                user: {
                    id: mockSeeker.id,
                    fullName: mockSeeker.fullName,
                    avatarUrl: mockSeeker.avatarUrl,
                    gender: mockSeeker.gender,
                    memberSince: '2026',
                },
                lifestyle: {
                    smoking: mockSeeker.lifestyle.smoking,
                    drinking: mockSeeker.lifestyle.drinking,
                    pets_allowed: mockSeeker.lifestyle.petsAllowed,
                    sleep_schedule: mockSeeker.lifestyle.sleepSchedule,
                    work_from_home: mockSeeker.lifestyle.workFromHome,
                    personalityType: 'Hòa đồng, văn minh',
                    social_level: mockSeeker.lifestyle.socialLevel,
                    cleanliness: mockSeeker.lifestyle.cleanliness,
                    noise_tolerance: mockSeeker.lifestyle.noiseTolerance,
                    guest_frequency: 'Ít khi',
                    cooking_frequency: mockSeeker.lifestyle.cookingFrequency,
                    wake_time: '06:30',
                    interests: mockSeeker.lifestyle.interests,
                    deal_breakers: mockSeeker.lifestyle.dealBreakers,
                },
                preference: {
                    preferred_districts: mockSeeker.preferredDistricts,
                    budget_min: mockSeeker.budgetMin,
                    budget_max: mockSeeker.budgetMax,
                    preferredLocation: mockSeeker.preferredDistricts.join(', '),
                    room_type: 'SHARED',
                    gender_preference: mockSeeker.gender === 'Nữ' ? 'NỮ' : 'NAM',
                },
                ratings: { average: 4.9, count: 12 },
            } as unknown as RoommatePublicProfile);
            setLoading(false);
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
                    className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 fade-in duration-200 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                            <Eye className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                                Hồ sơ người tìm ở ghép
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Đóng"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto">
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
                                            className="w-24 h-24 rounded-full object-cover border-3 border-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950 shadow-md"
                                        />
                                    </div>
                                    <div>
                                        <h2 className="font-heading text-xl font-extrabold text-slate-900 dark:text-white">
                                            {U?.fullName}
                                        </h2>
                                        {U?.gender && (
                                            <span className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                {U.gender}
                                            </span>
                                        )}
                                    </div>

                                    {matchScore != null && (
                                        <div>
                                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-800/60 font-bold text-xs shadow-xs">
                                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                                {matchScore}% phù hợp với bạn
                                            </span>
                                        </div>
                                    )}

                                    {U?.memberSince && (
                                        <p className="text-xs text-slate-400">
                                            Thành viên từ {new Date(U.memberSince).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                                        </p>
                                    )}
                                </div>

                                <div className="h-px bg-slate-200 dark:bg-slate-800" />

                                {/* Lifestyle Section */}
                                {L && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                                            <div className="mt-4 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-2.5">
                                                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Sở thích cá nhân
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {L.interests.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-200 border border-blue-200/90 dark:border-blue-800 shadow-xs"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Deal-breakers – High Contrast Warning Card */}
                                        {L.deal_breakers && (
                                            <div className="mt-3 p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border-l-4 border-l-rose-500 border border-rose-200/80 dark:border-rose-900/50">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wide mb-1.5">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Điều không chấp nhận (Deal-breakers)
                                                </div>
                                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed pl-1">
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
