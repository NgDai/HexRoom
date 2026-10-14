import { useEffect, useState, type FormEvent } from 'react';
import { Header, Footer } from '../home/components';
import { money, request } from '@/lib/hexroom-api';
type Profile = { id: string; nickname: string; city: string; budgetMin: number; budgetMax: number; moveInDate: string; smoking: boolean; hasPets: boolean; acceptSmoking: boolean; acceptPets: boolean; visible: boolean; sleepSchedule: string };
type Suggestion = { profile: Profile; matches: string[]; discuss: string[] };
export function RoommateDiscoveryPage() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    useEffect(() => {
        let active = true;
        request<Profile | null>('/roommates/profile').then(async data => {
            if (!active) return; setProfile(data);
            if (data?.visible) { const results = await request<Suggestion[]>('/roommates/suggestions'); if (active) setSuggestions(results); }
        }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);
    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); setBusy(true); setError(''); setSuccess('');
        const data = new FormData(event.currentTarget);
        try {
            const result = await request<Profile>('/roommates/profile', { method: 'PUT', body: JSON.stringify({ nickname: data.get('nickname'), city: data.get('city'), budgetMin: Number(data.get('budgetMin')), budgetMax: Number(data.get('budgetMax')), moveInDate: data.get('moveInDate'), sleepSchedule: data.get('sleepSchedule'), smoking: data.has('smoking'), hasPets: data.has('hasPets'), acceptSmoking: data.has('acceptSmoking'), acceptPets: data.has('acceptPets'), visible: data.has('visible'), adultConfirmed: data.has('adultConfirmed') }) });
            setProfile(result); setSuggestions([]); setSuccess(result.visible ? 'Đã lưu hồ sơ và bật hiển thị gợi ý.' : 'Đã ẩn hồ sơ khỏi gợi ý.');
            if (result.visible) setSuggestions(await request<Suggestion[]>('/roommates/suggestions'));
        } catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu hồ sơ'); } finally { setBusy(false); }
    };
    return <div className="hx-page"><Header /><main className="hx-container hx-section"><span className="hx-eyebrow">Ở GHÉP · BẮT ĐẦU VỚI HAI NGƯỜI</span><h1 style={{ fontSize: 36, fontWeight: 700, margin: '18px 0' }}>Tìm người có tiêu chí phù hợp</h1><p style={{ marginBottom: 25 }}>Gợi ý giúp bạn nhận biết điểm chung và điều cần trao đổi, không đảm bảo hai người sẽ sống hòa hợp.</p>{error && <div className="hx-error" role="alert">{error}</div>}{success && <div className="hx-success" role="status">{success}</div>}
        {loading ? <p role="status">Đang tải hồ sơ…</p> : <div className="hx-detail-grid"><form className="hx-panel" key={profile?.id ?? 'new'} onSubmit={save}><h2>Hồ sơ ở ghép của bạn</h2><p>Chỉ biệt danh, thành phố, ngân sách và các tiêu chí dưới đây được hiển thị khi bạn đồng ý. Không dùng số điện thoại hoặc địa chỉ cụ thể làm biệt danh.</p><div className="hx-fields"><label>Biệt danh<input name="nickname" maxLength={60} required defaultValue={profile?.nickname} /></label><label>Thành phố<input name="city" maxLength={120} required defaultValue={profile?.city} /></label><label>Ngân sách tối thiểu / người / tháng<input type="number" name="budgetMin" min={0} required defaultValue={profile?.budgetMin} /></label><label>Ngân sách tối đa / người / tháng<input type="number" name="budgetMax" min={1} required defaultValue={profile?.budgetMax} /></label><label>Ngày dự kiến chuyển vào<input type="date" name="moveInDate" required defaultValue={profile?.moveInDate} /></label><label>Giờ ngủ (có thể trao đổi)<select name="sleepSchedule" defaultValue={profile?.sleepSchedule ?? 'FLEXIBLE'}><option value="EARLY">Ngủ sớm</option><option value="LATE">Ngủ muộn</option><option value="FLEXIBLE">Linh hoạt</option></select></label></div>
            <div style={{ display: 'grid', gap: 14, marginTop: 22, fontSize: 13 }}>{[['smoking', 'Tôi hút thuốc'], ['hasPets', 'Tôi có thú cưng'], ['acceptSmoking', 'Tôi chấp nhận bạn ở ghép hút thuốc'], ['acceptPets', 'Tôi chấp nhận thú cưng']].map(([key, label]) => <label key={key}><input type="checkbox" name={key} defaultChecked={Boolean(profile?.[key as keyof Profile])} /> {label}</label>)}<p>Bỏ chọn “chấp nhận” đặt điều kiện bắt buộc cho cả hai chiều. Ngân sách phải giao nhau, cùng thành phố và ngày chuyển vào chênh tối đa 30 ngày.</p><label><input type="checkbox" name="adultConfirmed" required /> Tôi xác nhận mình từ 18 tuổi trở lên.</label><label><input type="checkbox" name="visible" defaultChecked={profile?.visible ?? false} /> Tôi đồng ý hiển thị các tiêu chí này để nhận gợi ý ở ghép.</label></div><div className="hx-actions"><button className="hx-button" disabled={busy}>Lưu tiêu chí & xem gợi ý</button></div></form>
            <aside><section className="hx-panel"><h2>Gợi ý dành cho bạn</h2>{!profile?.visible ? <p>Hồ sơ đang ẩn. Bật hiển thị và lưu tiêu chí để tham gia.</p> : suggestions.length === 0 ? <p>Chưa có hồ sơ đáp ứng điều kiện của cả hai. Bạn có thể cập nhật tiêu chí hoặc quay lại sau.</p> : suggestions.map(({ profile: other, matches, discuss }) => <article className="hx-inspection" key={other.id}><h3>{other.nickname}<span className="hx-badge">{other.city}</span></h3><p>{money(other.budgetMin)} – {money(other.budgetMax)} / người / tháng<br />Dự kiến chuyển vào: {other.moveInDate}</p><strong style={{ fontSize: 13 }}>Điểm phù hợp</strong><ul>{matches.map(text => <li key={text} style={{ fontSize: 13, margin: '8px 0' }}>{text}</li>)}</ul><strong style={{ fontSize: 13 }}>Cần trao đổi</strong><ul>{discuss.map(text => <li key={text} style={{ fontSize: 13, margin: '8px 0' }}>{text}</li>)}</ul></article>)}<p>Phiên bản này hỗ trợ khám phá tiêu chí. Gửi lời mời và mở chat khi cả hai đồng ý sẽ được bổ sung; thông tin liên hệ không được tự động chia sẻ.</p></section></aside>
        </div>}
    </main><Footer /></div>;
}
