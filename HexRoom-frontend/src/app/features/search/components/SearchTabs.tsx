import { useState } from 'react';
import { Search, Image } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type SearchTabValue = 'text' | 'image';

interface SearchTabsProps {
    defaultTab?: SearchTabValue;
    onTabChange?: (tab: SearchTabValue) => void;
    /** Show "Tìm bằng hình ảnh" tab (tenant/VIP only). */
    showImageTab?: boolean;
    children: (activeTab: SearchTabValue) => React.ReactNode;
}

interface TabButtonProps {
    value: SearchTabValue;
    activeTab: SearchTabValue;
    onClick: (value: SearchTabValue) => void;
    icon: React.ReactNode;
    label: string;
}

function TabButton({ value, activeTab, onClick, icon, label }: TabButtonProps) {
    const isActive = activeTab === value;

    return (
        <button
            onClick={() => onClick(value)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-foreground/60 hover:text-foreground'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}

export function SearchTabs({ defaultTab = 'text', onTabChange, showImageTab = true, children }: SearchTabsProps) {
    const [activeTab, setActiveTab] = useState<SearchTabValue>(defaultTab);
    const { t } = useTranslation();

    const handleTabChange = (tab: SearchTabValue) => {
        setActiveTab(tab);
        onTabChange?.(tab);
    };

    return (
        <div className="w-full">
            {showImageTab && (
            <div className="flex bg-muted p-1 rounded-xl max-w-md mx-auto mb-4 sm:mb-8">
                <TabButton
                    value="text"
                    activeTab={activeTab}
                    onClick={handleTabChange}
                    icon={<Search className="w-4 h-4" />}
                    label={t('search.tabText')}
                />
                <TabButton
                    value="image"
                    activeTab={activeTab}
                    onClick={handleTabChange}
                    icon={<Image className="w-4 h-4" />}
                    label={t('search.tabImage')}
                />
            </div>
            )}

            {/* Tab Content */}
            {children(showImageTab ? activeTab : 'text')}
        </div>
    );
}
