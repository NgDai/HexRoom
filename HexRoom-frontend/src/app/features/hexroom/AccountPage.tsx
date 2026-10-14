import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../home/components';
import { useAuth } from '@/app/context/useAuth';
import { request } from '@/lib/hexroom-api';
export function AccountPage() {
    const { user, refreshUser } = useAuth();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [busy, setBusy] = useState(false);
    const save = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault(); setBusy(true); setError(''); setSuccess('');
        const data = new FormData(e.currentTarget);
        try { await request('/auth/profile', { method: 'PUT', body: JSON.stringify({ fullName: data.get('fullName'), phone: data.get('phone'), gender: data.get('gender') }) }); await refreshUser(); setSuccess('Đã cập nhật hồ sơ cá nhân.'); }
        catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu hồ sơ'); } finally { setBusy(false); }
    };
    const password = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault(); const form = e.currentTarget; const data = new FormData(form);
        setBusy(true); setError(''); setSuccess('');
        try { await request('/auth/change-password', { method: 'POST', body: JSON.stringify(Object.fromEntries(data)) }); form.reset(); setSuccess('Đã đổi mật khẩu. Các phiên làm mới đã được thu hồi; lần đăng nhập tiếp theo dùng mật khẩu mới.'); }
        catch (e) { setError(e instanceof Error ? e.message : 'Không thể đổi mật khẩu'); } finally { setBusy(false); }
    };
    return <div className="hx-page"><Header /><main className="hx-container hx-section"><span className="hx-eyebrow">TÀI KHOẢN HEXROOM</span><h1 style={{ fontSize: 34, fontWeight: 700, margin: '18px 0' }}>Hồ sơ của bạn</h1>{error && <div className="hx-error" role="alert">{error}</div>}{success && <div className="hx-success" role="status">{success}</div>}<div className="hx-detail-grid"><form className="hx-panel" onSubmit={save}><h2>Thông tin cá nhân</h2><p>Email: {user?.email}</p><div className="hx-fields"><label>Họ và tên<input name="fullName" required maxLength={100} defaultValue={user?.fullName} /></label><label>Số điện thoại<input name="phone" defaultValue={user?.phone ?? ''} /></label><label>Giới tính<select name="gender" defaultValue={user?.gender ?? ''}><option value="">Không cung cấp</option><option>Nam</option><option>Nữ</option><option>Khác</option></select></label></div><div className="hx-actions"><button className="hx-button" disabled={busy}>Lưu hồ sơ</button><Link className="hx-outline-button" to="/roommate">Tiêu chí ở ghép</Link></div><p>Thông tin liên hệ trong hồ sơ không tự động chia sẻ cho người tìm bạn ở ghép.</p></form><form className="hx-panel" onSubmit={password}><h2>Đổi mật khẩu</h2><div className="hx-fields"><label className="hx-span">Mật khẩu hiện tại<input name="currentPassword" type="password" autoComplete="current-password" required /></label><label className="hx-span">Mật khẩu mới<input name="newPassword" type="password" autoComplete="new-password" minLength={8} required /></label><label className="hx-span">Nhập lại mật khẩu mới<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label></div><div className="hx-actions"><button className="hx-button" disabled={busy}>Đổi mật khẩu</button></div></form></div></main><Footer /></div>;
}
