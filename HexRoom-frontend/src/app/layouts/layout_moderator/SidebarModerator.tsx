import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Building2,
    DoorOpen,
    Flag,
    MessageSquareText,
    Users,
    ListTodo,
    ChevronLeft,
    ChevronRight,
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
    { label: 'Tổng quan', path: '/moderator', Icon: LayoutDashboard },
    { label: 'Moderation Queue', path: '/moderator/queue', Icon: ListTodo },
    { label: 'Duyệt nhà cho thuê', path: '/moderator/rentals', Icon: Building2 },
    { label: 'Duyệt bài đăng phòng', path: '/moderator/room-posts', Icon: DoorOpen },
    { label: 'Báo cáo vi phạm', path: '/moderator/reports', Icon: Flag },
    { label: 'Đánh giá', path: '/moderator/reviews', Icon: MessageSquareText },
    { label: 'Người thuê / Chủ trọ', path: '/moderator/users', Icon: Users },
] as const;

export default function SidebarModerator({
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
                                end={item.path === '/moderator'}
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
