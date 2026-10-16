import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Hexagon, Menu, X, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/app/context/useAuth';
import '@/app/features/hexroom/hexroom.css';

export function Header({ onLogin, onRegister }: { onLogin?: () => void; onRegister?: () => void }) {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');
    return <header className="hx-header"><div className="hx-nav-wrap">
        <Link className="hx-brand" to="/home"><Hexagon size={30} strokeWidth={2.5} /> HexRoom<span className="hx-brand-dot">.</span></Link>
        <button className="hx-mobile-toggle" aria-label="Mở menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        <nav className={'hx-nav ' + (open ? 'is-open' : '')} aria-label="Điều hướng chính">
            {/* Luôn hiển thị cho mọi vai trò */}
            <NavLink to="/rooms">Tìm phòng</NavLink>

            {/* Khách vãng lai và Người thuê */}
            {(!user || user.role === 'TENANT' || user.role === 'ADMIN') && (
                <>
                    <NavLink to="/roommate">Tìm bạn ở ghép</NavLink>
                    <NavLink to="/how-it-works">Cách HexRoom kiểm tra</NavLink>
                </>
            )}

            {/* Người thuê & Admin: Lịch hẹn xem phòng */}
            {user && (user.role === 'TENANT' || user.role === 'ADMIN') && (
                <NavLink to="/history">Lịch hẹn xem phòng</NavLink>
            )}

            {/* Chủ trọ & Admin: Quản lý phòng & ＋ Đăng phòng trọ */}
            {user && ['LANDLORD', 'ADMIN'].includes(user.role ?? '') && (
                <>
                    <NavLink to="/workspace">Quản lý phòng</NavLink>
                    <NavLink to="/workspace?mode=room" style={{ color: '#059669', fontWeight: 750, background: '#ECFDF5', padding: '6px 14px', borderRadius: '999px', border: '1px solid #A7F3D0' }}>
                        ＋ Đăng phòng trọ
                    </NavLink>
                </>
            )}

            {/* Kiểm định viên (Inspector) & Admin: Cổng Inspector */}
            {user && ['INSPECTOR', 'MODERATOR', 'ADMIN'].includes(user.role ?? '') && (
                <NavLink to="/inspector">Cổng Inspector</NavLink>
            )}

            {/* Chỉ Quản trị viên (Admin): Quản trị Admin */}
            {user && user.role === 'ADMIN' && (
                <NavLink to="/admin-portal">Quản trị Admin</NavLink>
            )}
        </nav>
        <div className="hx-nav-actions">{user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link to="/profile" className="hx-user">{user.fullName}</Link>
                <span style={{ fontSize: 11, background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                    {user.role}
                </span>
                <button className="hx-link" onClick={() => signOut().then(() => navigate('/home')).catch(e => setError(e.message))}>Đăng xuất</button>
            </div>
        ) : (
            <><button className="hx-link" onClick={onLogin ?? (() => navigate('/login'))}>Đăng nhập</button>
                <button className="hx-button" onClick={onRegister ?? (() => navigate('/register'))}>Tham gia <ArrowUpRight size={16} /></button></>
        )}</div>
        {error && <p role="alert">{error}</p>}
    </div></header>;
}
