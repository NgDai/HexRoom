import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Bell,
    Clock3,
    Home,
    LogOut,
    Menu,
    Search,
    Settings,
    UserCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/context/useAuth';

type RentalManagementNavbarProps = {
    onToggleDrawer: () => void;
    isSidebarOpen: boolean;
    sidebarWidth?: number;
    collapsedWidth?: number;
    title?: string;
    showSearch?: boolean;
    rightActions?: React.ReactNode;
    showBack?: boolean;
};

function useDesktop(breakpoint = 768) {
    const [isDesktop, setIsDesktop] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        return window.matchMedia(`(min-width: ${breakpoint}px)`).matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const media = window.matchMedia(`(min-width: ${breakpoint}px)`);
        const listener = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [breakpoint]);

    return isDesktop;
}

function toTitleFromPath(pathname: string) {
    if (pathname.includes('/room-posts/create')) return 'Thêm phòng';
    if (pathname.includes('/room-posts/') && pathname.match(/\/room-posts\/[^/]+$/)) return 'Chi tiết phòng';
    if (pathname.includes('/room-posts')) return 'Danh sách phòng';
    if (pathname.includes('/rentals/create')) return 'Thêm nhà cho thuê';
    if (pathname.includes('/rentals/') && pathname.match(/\/rentals\/[^/]+$/)) return 'Chi tiết nhà cho thuê';
    if (pathname.includes('/rentals')) return 'Danh sách nhà cho thuê';
    if (pathname.includes('/rental-management')) return 'Quản lý cho thuê';
    return 'Quản lý cho thuê';
}

export default function NavbarRentalManagements({
    onToggleDrawer,
    isSidebarOpen,
    sidebarWidth = 264,
    collapsedWidth = 76,
    title,
    showSearch = true,
    rightActions,
    showBack = false,
}: RentalManagementNavbarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { signOut } = useAuth();
    const isDesktop = useDesktop();
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [now, setNow] = useState('');

    useEffect(() => {
        const formatNow = () => {
            const date = new Date();
            const timeText = date.toLocaleTimeString('en-GB', { hour12: false });
            const dateText = date.toLocaleDateString('en-GB');
            setNow(`${timeText} | ${dateText}`);
        };

        formatNow();
        const timer = window.setInterval(formatNow, 1000);
        return () => window.clearInterval(timer);
    }, []);

    const computedTitle = useMemo(() => {
        return title ?? toTitleFromPath(location.pathname);
    }, [location.pathname, title]);

    const leftOffset = isDesktop ? (isSidebarOpen ? sidebarWidth : collapsedWidth) : 0;
    const navbarWidth = isDesktop ? `calc(100% - ${leftOffset}px)` : '100%';

    return (
        <header
            className="fixed top-0 z-40 h-16 border-b border-border bg-card/95 backdrop-blur"
            style={{
                left: leftOffset,
                width: navbarWidth,
                transition: 'left 220ms ease, width 220ms ease',
            }}
        >
            <div className="flex h-full items-center gap-3 px-4 sm:px-6">
                {showBack ? (
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label="Back"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                ) : null}

                <button
                    type="button"
                    onClick={onToggleDrawer}
                    className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label={isSidebarOpen ? 'Thu gọn menu' : 'Mở rộng menu'}
                >
                    <Menu className="h-5 w-5" />
                </button>

                <h1 className="font-heading truncate text-base font-semibold text-foreground sm:text-lg">{computedTitle}</h1>

                <div className="ml-auto flex items-center gap-2 sm:gap-3">
                    <Link
                        to="/home"
                        className="hidden items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground sm:flex transition-colors"
                    >
                        <Home className="h-4 w-4" />
                        Trang chủ
                    </Link>
                    {showSearch ? (
                        <label
                            className={cn(
                                'hidden items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-1.5 md:flex',
                                'focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10'
                            )}
                        >
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <input
                                value={searchText}
                                onChange={(event) => setSearchText(event.target.value)}
                                placeholder="Tìm kiếm..."
                                className="w-40 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground lg:w-56"
                                aria-label="Search"
                            />
                        </label>
                    ) : null}

                    <span className="hidden items-center gap-1 text-xs text-muted-foreground lg:flex">
                        <Clock3 className="h-4 w-4" />
                        {now}
                    </span>

                    <button
                        type="button"
                        className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label="Thông báo"
                    >
                        <Bell className="h-5 w-5" />
                    </button>

                    {rightActions}

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setMenuOpen((prev) => !prev)}
                            className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            aria-label="Menu tài khoản"
                        >
                            <UserCircle2 className="h-6 w-6" />
                        </button>

                        {menuOpen ? (
                            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-card p-1 shadow-lg">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        navigate('/profile');
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors"
                                >
                                    <Settings className="h-4 w-4" />
                                    Hồ sơ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        signOut();
                                        navigate('/home');
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Đăng xuất
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </header>
    );
}
