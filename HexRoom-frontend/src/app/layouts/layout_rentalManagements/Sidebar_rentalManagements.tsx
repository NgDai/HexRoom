import { NavLink } from 'react-router-dom';
import {
    Building2,
    CirclePlus,
    Crown,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    FileText,
    MessageSquare,
    Star,
    Wallet,
    Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SidebarProps = {
    open: boolean;
    onToggle: () => void;
    sidebarWidth?: number;
    collapsedWidth?: number;
};

const defaultSidebarWidth = 264;
const defaultCollapsedWidth = 76;

const items = [
    { label: 'Tổng quan', path: '/rental-management', Icon: LayoutDashboard },
    { label: 'Danh sách nhà cho thuê', path: '/rental-management/rentals', Icon: Building2 },
    { label: 'Yêu cầu', path: '/rental-management/requests', Icon: FileText },
    { label: 'Ví tiền', path: '/rental-management/wallet', Icon: Wallet },
    { label: 'Đánh giá phòng', path: '/rental-management/reviews', Icon: Star },
    { label: 'Đánh giá người thuê', path: '/rental-management/tenant-reviews', Icon: Users },
    { label: 'Tin nhắn', path: '/rental-management/messages', Icon: MessageSquare },
    { label: 'Đăng ký VIP', path: '/vip-plans?source=landlord-sidebar', Icon: Crown },
    { label: 'Thêm nhà cho thuê', path: '/rental-management/rentals/create', Icon: CirclePlus },
] as const;

export default function SidebarRentalManagements({
    open,
    onToggle,
    sidebarWidth = defaultSidebarWidth,
    collapsedWidth = defaultCollapsedWidth,
}: SidebarProps) {
    return (
        <aside
            className="fixed inset-y-0 left-0 z-50 border-r border-border bg-card pt-16"
            style={{
                width: open ? sidebarWidth : collapsedWidth,
                transition: 'width 220ms ease',
            }}
        >
            <nav className="flex h-full flex-col">
                <ul className="flex-1 space-y-1 p-2">
                    {items.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                end={item.path === '/rental-management'}
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                        'hover:bg-muted hover:text-foreground text-muted-foreground',
                                        isActive && 'bg-primary/10 text-primary hover:bg-primary/15'
                                    )
                                }
                            >
                                <item.Icon className="h-5 w-5 shrink-0" />
                                <span
                                    className={cn(
                                        'whitespace-nowrap transition-opacity',
                                        open ? 'opacity-100' : 'pointer-events-none opacity-0'
                                    )}
                                >
                                    {item.label}
                                </span>
                            </NavLink>
                        </li>
                    ))}
                </ul>

                <div className="border-t border-border p-2">
                    <button
                        type="button"
                        onClick={onToggle}
                        className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label={open ? 'Thu gọn' : 'Mở rộng'}
                    >
                        {open ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                </div>
            </nav>
        </aside>
    );
}
