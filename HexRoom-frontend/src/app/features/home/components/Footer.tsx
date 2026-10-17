import { Link } from 'react-router-dom';
import { ShieldCheck, HeartHandshake, MapPin, Mail, Phone } from 'lucide-react';

export function Footer() {
    return (
        <footer className="hx-footer">
            <div className="hx-footer-inner">
                <div className="hx-footer-col">
                    <Link className="hx-brand" to="/home">
                        <img src="/hexroom-logo.png" alt="HexRoom" className="w-8 h-8 object-contain shrink-0" />
                        <span>HexRoom</span>
                    </Link>
                    <p style={{ marginTop: 14, color: '#64748b', fontSize: 13, lineHeight: 1.7, maxWidth: 380 }}>
                        Nền tảng công nghệ kết nối thuê phòng trọ và tìm bạn cùng phòng minh bạch hàng đầu Việt Nam. Đối chiếu hiện trạng, không phí ẩn và hỗ trợ tận tâm.
                    </p>
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#475569' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><MapPin size={16} color="#10B981" /> Tòa nhà HexTower, 152 Nguyễn Gia Trí, Bình Thạnh, TP.HCM</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Phone size={16} color="#10B981" /> Hotline: 1900 8866 (8:00 - 21:00)</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Mail size={16} color="#10B981" /> Hỗ trợ: support@hexroom.vn</span>
                    </div>
                </div>

                <div className="hx-footer-col">
                    <h4>Tìm phòng trọ</h4>
                    <ul>
                        <li><Link to="/rooms?roomType=STUDIO">Căn hộ Studio</Link></li>
                        <li><Link to="/rooms?roomType=SHARED">Phòng ở ghép (Coliving)</Link></li>
                        <li><Link to="/rooms?roomType=PRIVATE">Phòng trọ khép kín</Link></li>
                        <li><Link to="/rooms?city=H%E1%BB%93+Ch%C3%AD+Minh">Phòng trọ TP. Hồ Chí Minh</Link></li>
                        <li><Link to="/rooms?city=H%C3%A0+N%E1%BB%99i">Phòng trọ Hà Nội</Link></li>
                        <li><Link to="/rooms?maxPrice=3000000">Phòng sinh viên dưới 3 triệu</Link></li>
                    </ul>
                </div>

                <div className="hx-footer-col">
                    <h4>Tìm bạn ở ghép</h4>
                    <ul>
                        <li><Link to="/roommate">Khám phá hồ sơ bạn cùng phòng</Link></li>
                        <li><Link to="/roommate">Tìm theo tiêu chí phong cách sống</Link></li>
                        <li><Link to="/roommate">Gợi ý độ tương thích 95%+</Link></li>
                        <li><Link to="/how-it-works">Nguyên tắc sống chung văn minh</Link></li>
                        <li><Link to="/how-it-works">Bảo vệ quyền riêng tư</Link></li>
                    </ul>
                </div>

                <div className="hx-footer-col">
                    <h4>Về HexRoom</h4>
                    <ul>
                        <li><Link to="/how-it-works">Quy trình kiểm định 4 bước</Link></li>
                        <li><Link to="/register">Dành cho chủ trọ & quản lý phòng</Link></li>
                        <li><Link to="/blog">Cẩm nang thuê phòng sinh viên</Link></li>
                        <li><Link to="/how-it-works">Chính sách minh bạch giá</Link></li>
                        <li><Link to="/how-it-works">Điều khoản & Quy định bảo mật</Link></li>
                    </ul>
                </div>
            </div>

            <div className="hx-footer-bottom">
                <div>
                    © {new Date().getFullYear()} <strong>HexRoom Inc.</strong> — Giải pháp an cư thế hệ mới cho người trẻ Việt Nam.
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 600 }}>
                        <ShieldCheck size={16} /> 100% Tin đăng kiểm tra
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 600 }}>
                        <HeartHandshake size={16} /> Đồng hành suốt hợp đồng
                    </span>
                </div>
            </div>
        </footer>
    );
}
