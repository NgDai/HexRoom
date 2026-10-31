import { Link } from 'react-router-dom';
import { ArrowUpRight, Mail } from 'lucide-react';

const groups = [
    { title: 'Khám phá', links: [['Tìm phòng', '/rooms'], ['Tìm bạn ở ghép', '/roommate'], ['Cẩm nang thuê phòng', '/blog']] },
    { title: 'Dành cho bạn', links: [['Hồ sơ cá nhân', '/profile'], ['Lịch hẹn xem phòng', '/history'], ['Đăng phòng cho thuê', '/workspace']] },
    { title: 'Về HexRoom', links: [['Cách hoạt động', '/how-it-works'], ['Quy trình kiểm tra', '/how-it-works'], ['Liên hệ hỗ trợ', 'mailto:support@hexroom.vn']] },
];
export function Footer() {
    return <footer className="hx-footer">
        <div className="hx-footer-inner">
            <div className="hx-footer-col hx-footer-brand">
                <Link className="hx-brand" to="/home"><img src="/hexroom-logo.png" alt="" /><span>HexRoom</span></Link>
                <p>Tìm chốn riêng. Sống chất riêng.</p>
                <a className="hx-footer-contact" href="mailto:support@hexroom.vn"><Mail size={15} /> support@hexroom.vn <ArrowUpRight size={13} /></a>
            </div>
            {groups.map(group => <div key={group.title} className="hx-footer-col"><h4>{group.title}</h4><ul>{group.links.map(([label, href]) => <li key={label}>{href.startsWith('mailto:') ? <a href={href}>{label}</a> : <Link to={href}>{label}</Link>}</li>)}</ul></div>)}
        </div>
        <div className="hx-footer-bottom"><span>© {new Date().getFullYear()} HexRoom</span><span>Không gian phù hợp, cuộc sống dễ dàng hơn.</span></div>
    </footer>;
}
