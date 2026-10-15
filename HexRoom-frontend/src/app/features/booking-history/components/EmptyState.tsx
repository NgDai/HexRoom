import { Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
    onExplore: () => void;
    tabLabel?: string;
}

export function EmptyState({ onExplore, tabLabel }: EmptyStateProps) {
    return (
        <div
            style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 20,
                padding: '48px 24px',
                textAlign: 'center',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            }}
        >
            <div
                style={{
                    width: 64,
                    height: 64,
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: '#059669',
                }}
            >
                <Calendar size={32} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                Chưa có {tabLabel ? tabLabel.toLowerCase() : 'lịch hẹn xem phòng nào'}
            </h3>
            <p style={{ fontSize: 14, color: '#64748B', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.6 }}>
                Khám phá hàng trăm căn phòng trọ đã được HexRoom kiểm định thực tế 4 bước và đặt lịch hẹn xem phòng ngay hôm nay!
            </p>
            <Link
                to="/rooms"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 24px',
                    background: '#10B981',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: 14,
                    borderRadius: 12,
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.2s ease',
                }}
            >
                Khám phá phòng trọ <ArrowRight size={16} />
            </Link>
        </div>
    );
}
