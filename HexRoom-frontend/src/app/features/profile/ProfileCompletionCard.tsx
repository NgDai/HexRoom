import { useState, type FormEvent } from 'react';
import { Modal } from 'antd';
import { CheckCircle2, Circle, Loader2, Pencil, Shield } from 'lucide-react';
import { useAuth } from '@/app/context/useAuth';
import type { AuthUser } from '@/app/context/auth-context';
import { updateProfileRequest } from '@/lib/api';

type Section = 'IDENTITY' | 'PHONE' | 'PERSONAL';

const sections: { id: Section; label: string; flag: keyof AuthUser }[] = [
    { id: 'IDENTITY', label: 'CCCD 12 số', flag: 'identityInfoUpdated' },
    { id: 'PHONE', label: 'Số điện thoại', flag: 'phoneInfoUpdated' },
    { id: 'PERSONAL', label: 'Thông tin cá nhân', flag: 'personalInfoUpdated' },
];

export function ProfileCompletionCard() {
    const { user, refreshUser } = useAuth();
    const [section, setSection] = useState<Section | null>(null);
    const [saving, setSaving] = useState(false);
    const completed = sections.filter(item => user?.[item.flag] === true).length;
    const progress = Math.round(completed / sections.length * 100);

    return (
        <>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        Hoàn thiện hồ sơ
                    </span>
                    <span className={`font-bold ${completed ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {progress}%
                    </span>
                </div>
                <div role="progressbar" aria-label="Tiến độ cập nhật hồ sơ" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-linear-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <ul className="space-y-2 text-[11px]">
                    {sections.map(item => {
                        const done = user?.[item.flag] === true;
                        const Icon = done ? CheckCircle2 : Circle;
                        return (
                            <li key={item.id} className={`flex items-start gap-1.5 ${done ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                                <span>{item.label}<span className="block text-[10px] mt-0.5">{done ? 'Đã cập nhật' : 'Chưa cập nhật'}</span></span>
                            </li>
                        );
                    })}
                </ul>
                <p className="text-[10px] text-muted-foreground" aria-live="polite">
                    {completed === 0 ? 'Bạn chưa cập nhật mục nào.' : `Đã cập nhật ${completed}/3 mục.`}
                </p>
                <button
                    type="button"
                    disabled={!user}
                    onClick={() => setSection(sections.find(item => user?.[item.flag] !== true)?.id ?? 'IDENTITY')}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                >
                    <Pencil className="w-3.5 h-3.5" /> Cập nhật
                </button>
            </div>
            <Modal
                title="Cập nhật hồ sơ"
                open={section !== null}
                onCancel={() => { if (!saving) setSection(null); }}
                footer={null}
                closable={!saving}
                keyboard={!saving}
                mask={{ closable: !saving }}
                destroyOnHidden
                width={480}
            >
                {section && user && (
                    <>
                        <p className="text-sm text-muted-foreground mb-4">Chọn từng mục và nhấn Cập nhật để lưu thông tin. Dấu tích xanh thể hiện thông tin đã được cập nhật.</p>
                        <div className="grid grid-cols-3 gap-2 mb-5" aria-label="Mục cần cập nhật">
                            {sections.map(item => (
                                <button key={item.id} type="button" disabled={saving} aria-pressed={section === item.id} onClick={() => setSection(item.id)} className={`rounded-lg border px-2 py-2 text-xs font-medium disabled:opacity-50 ${section === item.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <SectionForm
                            key={`${user.id}:${section}`}
                            section={section}
                            user={user}
                            saving={saving}
                            setSaving={setSaving}
                            onSaved={async () => { await refreshUser(); setSection(null); }}
                            onCancel={() => setSection(null)}
                        />
                    </>
                )}
            </Modal>
        </>
    );
}

function SectionForm({ section, user, saving, setSaving, onSaved, onCancel }: {
    section: Section;
    user: AuthUser;
    saving: boolean;
    setSaving: (saving: boolean) => void;
    onSaved: () => Promise<void>;
    onCancel: () => void;
}) {
    const [identity, setIdentity] = useState(user.identityCardNumber ?? '');
    const [phone, setPhone] = useState(user.phone ?? '');
    const [fullName, setFullName] = useState(user.fullName ?? '');
    const [gender, setGender] = useState(user.gender ?? '');
    const [error, setError] = useState('');
    const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30';

    const save = async (event: FormEvent) => {
        event.preventDefault();
        const normalizedPhone = phone.replace(/[\s.-]/g, '');
        if (section === 'IDENTITY' && !/^\d{12}$/.test(identity.trim())) {
            setError('Số CCCD phải gồm đúng 12 chữ số.');
            return;
        }
        if (section === 'PHONE' && !/^(?:0|\+84)[35789]\d{8}$/.test(normalizedPhone)) {
            setError('Vui lòng nhập số điện thoại Việt Nam hợp lệ.');
            return;
        }
        if (section === 'PERSONAL' && (!fullName.trim() || !gender)) {
            setError('Vui lòng nhập họ tên và chọn giới tính.');
            return;
        }
        setError('');
        setSaving(true);
        try {
            await updateProfileRequest({
                completionSection: section,
                ...(section === 'IDENTITY' ? { identityCardNumber: identity.trim() } : {}),
                ...(section === 'PHONE' ? { phone: normalizedPhone } : {}),
                ...(section === 'PERSONAL' ? { fullName: fullName.trim(), gender } : {}),
            });
            await onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể cập nhật. Vui lòng thử lại.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={save} className="space-y-4">
            <fieldset disabled={saving} className="space-y-4">
                {section === 'IDENTITY' && (
                    <div className="space-y-2">
                        <label htmlFor="completion-identity" className="block text-sm font-medium">Số căn cước công dân</label>
                        <input autoFocus id="completion-identity" value={identity} onChange={event => setIdentity(event.target.value)} inputMode="numeric" maxLength={12} placeholder="Nhập 12 chữ số CCCD" required className={inputClass} />
                        <p className="text-xs text-muted-foreground">Lưu số CCCD là bước bổ sung hồ sơ, chưa phải kết quả đối chiếu danh tính.</p>
                    </div>
                )}
                {section === 'PHONE' && (
                    <div className="space-y-2">
                        <label htmlFor="completion-phone" className="block text-sm font-medium">Số điện thoại liên hệ</label>
                        <input autoFocus id="completion-phone" type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} maxLength={20} placeholder="Nhập số điện thoại của bạn" required className={inputClass} />
                        <p className="text-xs text-muted-foreground">Số điện thoại được lưu để liên hệ. Xác thực OTP là bước riêng.</p>
                    </div>
                )}
                {section === 'PERSONAL' && (
                    <>
                        <div className="space-y-2">
                            <label htmlFor="completion-name" className="block text-sm font-medium">Họ và tên</label>
                            <input autoFocus id="completion-name" autoComplete="name" value={fullName} onChange={event => setFullName(event.target.value)} maxLength={100} required className={inputClass} />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="completion-gender" className="block text-sm font-medium">Giới tính</label>
                            <select id="completion-gender" value={gender} onChange={event => setGender(event.target.value)} required className={inputClass}>
                                <option value="">Chọn giới tính</option>
                                {['Nam', 'Nữ', 'Khác', 'Không tiết lộ'].map(value => <option key={value} value={value}>{value}</option>)}
                            </select>
                        </div>
                    </>
                )}
            </fieldset>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button type="button" disabled={saving} onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50">Hủy</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
            </div>
        </form>
    );
}
