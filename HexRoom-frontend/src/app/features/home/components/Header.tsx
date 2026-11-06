import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowUpRight, ChevronDown, LogOut, User, Heart, CalendarDays, Home } from 'lucide-react';
import { useAuth } from '@/app/context/useAuth';
import '@/app/features/hexroom/hexroom.css';
import '@/app/design-system.css';

export function Header({ onLogin, onRegister }: { onLogin?: () => void; onRegister?: () => void }) {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');
    return <header className="hx-header"><div className="hx-nav-wrap relative flex items-center justify-between w-full">
        <Link className="hx-brand shrink-0 z-10" to="/home">
            <img src="/hexroom-logo.png" alt="HexRoom" className="w-8 h-8 object-contain shrink-0" />
            <span>HexRoom</span>
        </Link>
        <button className="hx-mobile-toggle" aria-label={open ? 'Đóng menu' : 'Mở menu'} aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        <nav id="main-navigation" className={'hx-nav ' + (open ? 'is-open' : '')} aria-label="Điều hướng chính" onClick={() => setOpen(false)}>
            <NavLink to="/home">Trang chủ</NavLink>
            {/* Luôn hiển thị cho mọi vai trò */}
            <NavLink to="/rooms">Tìm phòng</NavLink>

            {/* Khách vãng lai và Người thuê */}
            {(!user || user.role === 'TENANT' || user.role === 'ADMIN') && (
                <>
                    <NavLink to="/roommate">Tìm bạn ở ghép</NavLink>
                    <NavLink to="/how-it-works">Cách hoạt động</NavLink>
                </>
            )}

            {/* Người thuê & Admin: Lịch hẹn xem phòng */}
            {user && (user.role === 'TENANT' || user.role === 'ADMIN') && (
                <NavLink to="/history">Lịch hẹn</NavLink>
            )}

            {/* Người thuê: quản lý phòng đang thuê sau khi hợp đồng được xác nhận */}
            {user && (user.role === 'TENANT' || user.role === 'ADMIN') && (
                <NavLink to="/my-rooms">Phòng của tôi</NavLink>
            )}

            {/* Chủ trọ & Admin: Quản lý phòng & ＋ Đăng phòng trọ */}
            {user && ['LANDLORD', 'ADMIN'].includes(user.role ?? '') && (
                <>
                    <NavLink to="/workspace">Quản lý phòng</NavLink>
                    <NavLink to="/tenancy-management">Quản lý thuê</NavLink>
                    <Link to="/workspace?mode=room" className="hx-nav-post-pill" style={{ color: '#059669', fontWeight: 750, background: '#ECFDF5', padding: '6px 14px', borderRadius: '999px', border: '1px solid #A7F3D0' }}>
                        ＋ Đăng phòng
                    </Link>
                </>
            )}

            {/* Kiểm định viên (Inspector) & Admin: Cổng Inspector */}
            {user && ['INSPECTOR', 'MODERATOR', 'ADMIN'].includes(user.role ?? '') && (
                <NavLink to="/inspector">Kiểm định</NavLink>
            )}

            {/* Chỉ Quản trị viên (Admin): Quản trị Admin */}
            {user && user.role === 'ADMIN' && (
                <NavLink to="/admin-portal">Quản trị</NavLink>
            )}
        </nav>
        <div className="hx-nav-actions">{user ? (
            <details className="hx-account-menu">
                <summary aria-label="Menu tài khoản"><span className="hx-account-avatar">{user.fullName?.trim().split(/\s+/).pop()?.slice(0, 1) || <User size={16} />}</span><span className="hx-account-name">{user.fullName || 'Tài khoản'}</span><ChevronDown size={14} /></summary>
                <div className="hx-account-dropdown" onClick={event => { const details = event.currentTarget.closest('details'); if (details) details.open = false; }}>
                    <Link to="/profile"><User size={16} /> Hồ sơ của tôi</Link>
                    {user.role === 'TENANT' && <><Link to="/favorites"><Heart size={16} /> Phòng đã lưu</Link><Link to="/history"><CalendarDays size={16} /> Lịch hẹn</Link><Link to="/my-rooms"><Home size={16} /> Phòng của tôi</Link></>}
                    {user.role === 'LANDLORD' && <Link to="/tenancy-management"><Home size={16} /> Quản lý thuê</Link>}
                    <button onClick={() => signOut().then(() => navigate('/home')).catch(e => setError(e.message))}><LogOut size={16} /> Đăng xuất</button>
                </div>
            </details>
        ) : (
            <><button className="hx-link" onClick={onLogin ?? (() => navigate('/login'))}>Đăng nhập</button>
                <button className="hx-button" onClick={onRegister ?? (() => navigate('/register'))}>Đăng ký <ArrowUpRight size={16} /></button></>
        )}</div>
        {error && <p role="alert">{error}</p>}
    </div></header>;
}
