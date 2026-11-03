import { useState, useEffect, useRef } from 'react';
import {
    FileText, X, ExternalLink, CheckCircle2, MessageSquareHeart,
    Sparkles, HelpCircle, ThumbsUp, Loader2
} from 'lucide-react';

const GOOGLE_FORM_DIRECT_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScuZlEQdpggRLS34HuVNhpRZ3wa4uLyPJ1TkflN4NUhgP0l7A/viewform';
const GOOGLE_FORM_EMBED_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScuZlEQdpggRLS34HuVNhpRZ3wa4uLyPJ1TkflN4NUhgP0l7A/viewform?embedded=true';

const STORAGE_KEY_COMPLETED = 'hexroom_survey_completed';
const STORAGE_KEY_DISMISSED = 'hexroom_survey_dismissed_until';
const STORAGE_KEY_PAGE_VIEWS = 'hexroom_session_page_views';

export function UserSurveyWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoadingIframe, setIsLoadingIframe] = useState(true);
    const [hasCompleted, setHasCompleted] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY_COMPLETED) === 'true';
        } catch {
            return false;
        }
    });

    // Tracking time spent on site for "sau khi người dùng trải nghiệm xong trang web"
    useEffect(() => {
        // Track page views in this session
        try {
            const currentViews = parseInt(sessionStorage.getItem(STORAGE_KEY_PAGE_VIEWS) || '0', 10) + 1;
            sessionStorage.setItem(STORAGE_KEY_PAGE_VIEWS, currentViews.toString());
        } catch {
            // ignore
        }

        // Custom event listener so other parts of the site can trigger survey after completion
        const handleCustomOpen = () => {
            setIsOpen(true);
        };
        window.addEventListener('hexroom:open-survey', handleCustomOpen);

        // Check if user has already completed or dismissed recently
        try {
            if (localStorage.getItem(STORAGE_KEY_COMPLETED) === 'true') {
                return () => window.removeEventListener('hexroom:open-survey', handleCustomOpen);
            }
            const dismissedUntil = localStorage.getItem(STORAGE_KEY_DISMISSED);
            if (dismissedUntil && parseInt(dismissedUntil, 10) > Date.now()) {
                return () => window.removeEventListener('hexroom:open-survey', handleCustomOpen);
            }
        } catch {
            // ignore
        }

        // Trigger 1: Auto popup after the user has experienced the website (40 seconds of active browsing)
        const experienceTimer = setTimeout(() => {
            try {
                if (localStorage.getItem(STORAGE_KEY_COMPLETED) !== 'true') {
                    const dismissedUntil = localStorage.getItem(STORAGE_KEY_DISMISSED);
                    if (!dismissedUntil || parseInt(dismissedUntil, 10) <= Date.now()) {
                        setIsOpen(true);
                    }
                }
            } catch {
                setIsOpen(true);
            }
        }, 40000);

        // Trigger 2: Exit-intent (when user moves mouse toward browser header to leave / close tab)
        let hasTriggeredExitIntent = false;
        const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 8 && !hasTriggeredExitIntent) {
                try {
                    const dismissedUntil = localStorage.getItem(STORAGE_KEY_DISMISSED);
                    const isDone = localStorage.getItem(STORAGE_KEY_COMPLETED) === 'true';
                    if (!isDone && (!dismissedUntil || parseInt(dismissedUntil, 10) <= Date.now())) {
                        hasTriggeredExitIntent = true;
                        setIsOpen(true);
                    }
                } catch {
                    setIsOpen(true);
                }
            }
        };

        // Attach exit-intent listener only after user has spent at least 15s
        const exitIntentDelay = setTimeout(() => {
            document.addEventListener('mouseleave', handleMouseLeave);
        }, 15000);

        return () => {
            window.removeEventListener('hexroom:open-survey', handleCustomOpen);
            clearTimeout(experienceTimer);
            clearTimeout(exitIntentDelay);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        try {
            // Snooze auto-popup for 24 hours
            localStorage.setItem(STORAGE_KEY_DISMISSED, (Date.now() + 24 * 60 * 60 * 1000).toString());
        } catch {
            // ignore
        }
    };

    const handleMarkCompleted = () => {
        try {
            localStorage.setItem(STORAGE_KEY_COMPLETED, 'true');
        } catch {}
        setHasCompleted(true);
        setIsOpen(false);
        alert('🎉 Cảm ơn bạn rất nhiều đã dành thời gian đóng góp ý kiến để giúp HexRoom ngày càng hoàn thiện!');
    };

    return (
        <>
            {/* ── NÚT NỔI KHẢO SÁT CỐ ĐỊNH (BOTTOM-LEFT) ── */}
            <div
                style={{
                    position: 'fixed',
                    bottom: 24,
                    left: 24,
                    zIndex: 9990,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}
            >
                <button
                    type="button"
                    onClick={() => {
                        setIsLoadingIframe(true);
                        setIsOpen(true);
                    }}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 16px',
                        borderRadius: 999,
                        background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        boxShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.45), 0 2px 6px rgba(0,0,0,0.08)',
                        cursor: 'pointer',
                        fontWeight: 750,
                        fontSize: 13,
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 12px 28px -4px rgba(16, 185, 129, 0.55)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(16, 185, 129, 0.45)';
                    }}
                    title="Đánh giá & Khảo sát trải nghiệm của bạn trên HexRoom"
                >
                    <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <FileText size={17} />
                        <span
                            style={{
                                position: 'absolute',
                                top: -3,
                                right: -3,
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: '#FDE047',
                                boxShadow: '0 0 6px #FDE047',
                            }}
                        />
                    </span>
                    <span>Khảo sát trải nghiệm</span>
                </button>
            </div>

            {/* ── MODAL KHẢO SÁT EMBED GOOGLE FORMS ── */}
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.72)',
                        backdropFilter: 'blur(5px)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                        animation: 'hxSurveyFadeIn 0.2s ease-out',
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            maxWidth: 780,
                            height: '90vh',
                            maxHeight: 820,
                            background: '#FFFFFF',
                            borderRadius: 24,
                            border: '1px solid #E2E8F0',
                            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Modal Header */}
                        <div
                            style={{
                                padding: '16px 22px',
                                borderBottom: '1px solid #E2E8F0',
                                background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexShrink: 0,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: 12,
                                        background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                                        border: '1px solid #A7F3D0',
                                        color: '#059669',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)',
                                    }}
                                >
                                    <MessageSquareHeart size={22} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                            Khảo Sát Trải Nghiệm Người Dùng HexRoom
                                        </h3>
                                        <span style={{ fontSize: 11, background: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: 999, fontWeight: 750, border: '1px solid #A7F3D0' }}>
                                            1 - 2 Phút
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 12, color: '#64748B', margin: '3px 0 0', lineHeight: 1.4 }}>
                                        Cảm ơn bạn đã trải nghiệm website! Ý kiến của bạn giúp chúng tôi hoàn thiện sản phẩm tốt hơn.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <a
                                    href={GOOGLE_FORM_DIRECT_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '7px 12px',
                                        borderRadius: 10,
                                        background: '#F1F5F9',
                                        border: '1px solid #CBD5E1',
                                        color: '#334155',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                    }}
                                    title="Mở toàn màn hình trong tab mới"
                                >
                                    <ExternalLink size={13} /> Mở tab mới
                                </a>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 10,
                                        background: '#F1F5F9',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: '#64748B',
                                        transition: 'background 0.15s',
                                    }}
                                    title="Đóng khảo sát"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Google Forms iframe with loading state */}
                        <div style={{ position: 'relative', flex: 1, background: '#F8FAFC', overflow: 'hidden' }}>
                            {isLoadingIframe && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#FFFFFF',
                                        zIndex: 2,
                                    }}
                                >
                                    <Loader2 size={32} style={{ color: '#10B981', animation: 'hxSpin 1s linear infinite', marginBottom: 12 }} />
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                                        Đang tải phiếu khảo sát Google Forms...
                                    </div>
                                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                                        Vui lòng chờ trong giây lát
                                    </div>
                                </div>
                            )}

                            <iframe
                                src={GOOGLE_FORM_EMBED_URL}
                                title="Khảo sát trải nghiệm HexRoom"
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                marginHeight={0}
                                marginWidth={0}
                                onLoad={() => setIsLoadingIframe(false)}
                                style={{
                                    border: 'none',
                                    width: '100%',
                                    height: '100%',
                                    background: '#FFFFFF',
                                }}
                            >
                                Đang tải biểu mẫu khảo sát...
                            </iframe>
                        </div>

                        {/* Modal Footer */}
                        <div
                            style={{
                                padding: '14px 22px',
                                borderTop: '1px solid #E2E8F0',
                                background: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 10,
                                flexShrink: 0,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                                <CheckCircle2 size={15} style={{ color: '#059669' }} />
                                <span>Khảo sát được bảo mật an toàn trực tiếp trên Google Forms</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: 10,
                                        background: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        color: '#64748B',
                                        fontWeight: 650,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Để sau
                                </button>
                                <button
                                    type="button"
                                    onClick={handleMarkCompleted}
                                    style={{
                                        padding: '8px 20px',
                                        borderRadius: 10,
                                        background: '#10B981',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        fontWeight: 750,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                                    }}
                                >
                                    <CheckCircle2 size={15} /> Tôi đã hoàn thành khảo sát
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes hxSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes hxSurveyFadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </>
    );
}
