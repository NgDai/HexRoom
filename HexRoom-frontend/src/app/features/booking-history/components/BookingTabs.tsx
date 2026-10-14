import { BOOKING_TABS, type BookingTabValue } from '../constants';

interface BookingTabsProps {
    activeTab: BookingTabValue;
    onTabChange: (tab: BookingTabValue) => void;
}

export function BookingTabs({ activeTab, onTabChange }: BookingTabsProps) {
    return (
        <div className="flex gap-2 mb-6 border-b border-border">
            {BOOKING_TABS.map((tab) => (
                <button
                    key={tab.value}
                    onClick={() => onTabChange(tab.value)}
                    className={`px-4 py-3 border-b-2 transition-colors ${activeTab === tab.value
                            ? 'border-primary text-primary font-medium'
                            : 'border-transparent text-foreground/60 hover:text-foreground'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
