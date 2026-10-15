import { BOOKING_TABS, type BookingTabValue } from '../constants';

interface BookingTabsProps {
    activeTab: BookingTabValue;
    onTabChange: (tab: BookingTabValue) => void;
}

export function BookingTabs({ activeTab, onTabChange }: BookingTabsProps) {
    return (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #E2E8F0', overflowX: 'auto', paddingBottom: 2 }}>
            {BOOKING_TABS.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                    <button
                        key={tab.value}
                        type="button"
                        onClick={() => onTabChange(tab.value)}
                        style={{
                            padding: '10px 18px',
                            borderBottom: isActive ? '3px solid #10B981' : '3px solid transparent',
                            color: isActive ? '#059669' : '#64748B',
                            fontWeight: isActive ? 750 : 600,
                            fontSize: 14,
                            background: 'transparent',
                            borderTop: 'none',
                            borderLeft: 'none',
                            borderRight: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
                            marginBottom: -2,
                        }}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
