import { Link } from 'react-router-dom';
import {
    FileText,
    ShieldCheck,
    Clock,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Eye,
    ArrowRight,
    Info,
    Shield,
    CalendarClock,
    Sparkles,
} from 'lucide-react';
import { Header, Footer } from '../home/components';

export function HowItWorksPage() {
    return (
        <div className="hx-page">
            <Header />

            <main className="hx-container hx-section" style={{ paddingTop: 32, paddingBottom: 64 }}>
                {/* Header Banner */}
                <div style={{ marginBottom: 36 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#059669', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>
                        <Sparkles size={14} className="text-emerald-600" />
                        Minh bạch từng hạng mục
                    </div>
                    <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 12px' }}>
                        Hiểu đúng hồ sơ kiểm tra HexRoom
                    </h1>
                    <p style={{ fontSize: 16, color: '#475569', maxWidth: 780, lineHeight: 1.65, margin: 0 }}>
                        Quy trình chuẩn hóa 3 bước giúp người thuê và chủ nhà đối chiếu thông tin trung thực, khách quan và loại bỏ hoàn toàn các rủi ro phòng ảo, giá ảo.
                    </p>
                </div>

                {/* Main 2-Column Content */}
                <div className="hx-detail-grid">
                    {/* Left Column: 3 Core Verification Principles */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Step 01 */}
                        <div
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: 20,
                                padding: 28,
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                                position: 'relative',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 14,
                                        background: '#ECFDF5',
                                        color: '#059669',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                    }}
                                >
                                    <FileText size={24} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: '#059669', background: 'rgba(5, 150, 105, 0.1)', padding: '2px 8px', borderRadius: 999 }}>
                                            BƯỚC 01
                                        </span>
                                    </div>
                                    <h2 style={{ fontSize: 20, fontWeight: 750, color: '#0F172A', margin: '0 0 8px' }}>
                                        Chủ trọ kê khai thông tin ban đầu
                                    </h2>
                                    <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, margin: 0 }}>
                                        Chủ trọ khai báo chi tiết giá thuê niêm yết, diện tích, tiền đặt cọc, kỳ thanh toán, nội quy tòa nhà, biểu phí dịch vụ và ảnh chụp phòng thực tế.
                                    </p>

                                    <div
                                        style={{
                                            marginTop: 16,
                                            padding: '12px 16px',
                                            borderRadius: 12,
                                            background: '#F8FAFC',
                                            border: '1px solid #E2E8F0',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 10,
                                            fontSize: 13,
                                            color: '#334155',
                                            lineHeight: 1.55,
                                        }}
                                    >
                                        <Info size={16} style={{ color: '#059669', flexShrink: 0, marginTop: 2 }} />
                                        <div>
                                            <strong>Quy tắc minh bạch:</strong> Khoản phí chưa có thông tin sẽ hiển thị rõ <em>"Chưa cung cấp"</em>. Chỉ khi hiển thị số <strong>0đ</strong> thì mới có nghĩa là miễn phí.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 02 */}
                        <div
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: 20,
                                padding: 28,
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                                position: 'relative',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 14,
                                        background: '#EFF6FF',
                                        color: '#2563EB',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        border: '1px solid rgba(37, 99, 235, 0.2)',
                                    }}
                                >
                                    <ShieldCheck size={24} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: '#2563EB', background: 'rgba(37, 99, 235, 0.1)', padding: '2px 8px', borderRadius: 999 }}>
                                            BƯỚC 02
                                        </span>
                                    </div>
                                    <h2 style={{ fontSize: 20, fontWeight: 750, color: '#0F172A', margin: '0 0 8px' }}>
                                        HexRoom khảo sát & Đối chiếu thực tế từng hạng mục
                                    </h2>
                                    <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, margin: 0 }}>
                                        Chuyên viên kiểm định đến tận căn phòng để chụp ảnh góc rộng 360°, đo đạc hiện trạng, kiểm tra hệ thống điện nước, thiết bị nội thất và đối chiếu giấy tờ pháp lý/ủy quyền quản lý.
                                    </p>

                                    <div
                                        style={{
                                            marginTop: 16,
                                            padding: '12px 16px',
                                            borderRadius: 12,
                                            background: '#EFF6FF',
                                            border: '1px solid #DBEAFE',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 10,
                                            fontSize: 13,
                                            color: '#1E40AF',
                                            lineHeight: 1.55,
                                        }}
                                    >
                                        <ShieldCheck size={16} style={{ color: '#2563EB', flexShrink: 0, marginTop: 2 }} />
                                        <div>
                                            <strong>Độc lập & Trung thực:</strong> Ảnh kiểm tra được gắn nhãn riêng biệt 100% với ảnh chủ nhà đăng tải. Kiểm định căn phòng nào chỉ xác nhận đúng căn phòng đó, không đại diện toàn bộ tòa nhà.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 03 */}
                        <div
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: 20,
                                padding: 28,
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                                position: 'relative',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 14,
                                        background: '#FFFBEB',
                                        color: '#D97706',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        border: '1px solid rgba(217, 119, 6, 0.2)',
                                    }}
                                >
                                    <CalendarClock size={24} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: '#D97706', background: 'rgba(217, 119, 6, 0.1)', padding: '2px 8px', borderRadius: 999 }}>
                                            BƯỚC 03
                                        </span>
                                    </div>
                                    <h2 style={{ fontSize: 20, fontWeight: 750, color: '#0F172A', margin: '0 0 8px' }}>
                                        Thời điểm xác nhận & Giới hạn hiệu lực
                                    </h2>
                                    <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, margin: 0 }}>
                                        Trạng thái "Đã đối chiếu" có thời hạn ghi nhận rõ ràng (thường 6 tháng). Khi quá hạn hoặc chủ trọ thay đổi giá/nội thất, hệ thống sẽ tự động chuyển sang "Cần cập nhật" và giữ nguyên lịch sử kiểm tra.
                                    </p>

                                    <div
                                        style={{
                                            marginTop: 16,
                                            padding: '12px 16px',
                                            borderRadius: 12,
                                            background: '#FFFBEB',
                                            border: '1px solid #FDE68A',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 10,
                                            fontSize: 13,
                                            color: '#92400E',
                                            lineHeight: 1.55,
                                        }}
                                    >
                                        <Clock size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
                                        <div>
                                            <strong>Thời gian thực:</strong> Ngày chủ nhà xác nhận còn phòng được cập nhật theo thời gian thực để người thuê không mất công đến xem phòng đã có người cọc.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Status Meanings & Transparent Governance */}
                    <aside
                        style={{
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: 20,
                            padding: 26,
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                            alignSelf: 'start',
                        }}
                    >
                        <h2 style={{ fontSize: 18, fontWeight: 750, color: '#0F172A', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Shield size={20} style={{ color: '#059669' }} /> Các trạng thái kiểm tra cần biết
                        </h2>

                        {/* List of 5 Statuses */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {/* 1. Đã đối chiếu */}
                            <div style={{ padding: 12, borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <CheckCircle2 size={15} style={{ color: '#16A34A' }} />
                                    <strong style={{ fontSize: 13, color: '#15803D' }}>Đã đối chiếu</strong>
                                </div>
                                <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.5 }}>
                                    Có ngày khảo sát, phương pháp kiểm tra tận nơi và ảnh bằng chứng rõ ràng.
                                </div>
                            </div>

                            {/* 2. Chưa đối chiếu */}
                            <div style={{ padding: 12, borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <Clock size={15} style={{ color: '#64748B' }} />
                                    <strong style={{ fontSize: 13, color: '#334155' }}>Chưa đối chiếu</strong>
                                </div>
                                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                                    Phòng mới đăng tải từ chủ trọ, chưa được chuyên viên HexRoom đến kiểm tra.
                                </div>
                            </div>

                            {/* 3. Cần cập nhật */}
                            <div style={{ padding: 12, borderRadius: 12, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <AlertTriangle size={15} style={{ color: '#D97706' }} />
                                    <strong style={{ fontSize: 13, color: '#B45309' }}>Cần cập nhật</strong>
                                </div>
                                <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                                    Thông tin đã quá hạn hiệu lực (trên 6 tháng) hoặc có sự thay đổi giá/biểu phí.
                                </div>
                            </div>

                            {/* 4. Đang xem xét phản ánh */}
                            <div style={{ padding: 12, borderRadius: 12, background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <Eye size={15} style={{ color: '#0284C7' }} />
                                    <strong style={{ fontSize: 13, color: '#0369A1' }}>Đang xem xét phản ánh</strong>
                                </div>
                                <div style={{ fontSize: 12, color: '#075985', lineHeight: 1.5 }}>
                                    Đang thụ lý phản hồi từ người thuê; chuyên viên đang tiến hành phúc tra.
                                </div>
                            </div>

                            {/* 5. Đã xác nhận sai lệch */}
                            <div style={{ padding: 12, borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <XCircle size={15} style={{ color: '#DC2626' }} />
                                    <strong style={{ fontSize: 13, color: '#B91C1C' }}>Đã xác nhận sai lệch</strong>
                                </div>
                                <div style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.5 }}>
                                    Đã có kết luận vi phạm thông tin; bài đăng bị gắn cảnh báo hoặc tạm dừng.
                                </div>
                            </div>
                        </div>

                        {/* Transparency Disclaimer */}
                        <div
                            style={{
                                marginTop: 20,
                                paddingTop: 16,
                                borderTop: '1px solid #E2E8F0',
                                fontSize: 12,
                                color: '#64748B',
                                lineHeight: 1.6,
                            }}
                        >
                            <p style={{ margin: '0 0 8px' }}>
                                • Đối chiếu hiện trạng không đồng nghĩa với xác minh toàn diện về pháp lý, kết cấu và PCCC.
                            </p>
                            <p style={{ margin: '0 0 8px' }}>
                                • Phí kiểm tra trả cho công sức khảo sát thực tế; tuyệt đối không bán hoặc "mua kết quả đạt".
                            </p>
                            <p style={{ margin: 0 }}>
                                • HexRoom không giữ tiền cọc hoặc đứng giữa dòng tiền thuê giữa 2 bên.
                            </p>
                        </div>

                        {/* CTA Link */}
                        <Link
                            to="/rooms"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                width: '100%',
                                marginTop: 20,
                                padding: '12px 20px',
                                background: '#10B981',
                                color: '#FFFFFF',
                                borderRadius: 12,
                                fontWeight: 700,
                                fontSize: 14,
                                textDecoration: 'none',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                transition: 'all 0.2s ease',
                                boxSizing: 'border-box',
                            }}
                        >
                            Khám phá phòng trọ <ArrowRight size={16} />
                        </Link>
                    </aside>
                </div>
            </main>

            <Footer />
        </div>
    );
}
