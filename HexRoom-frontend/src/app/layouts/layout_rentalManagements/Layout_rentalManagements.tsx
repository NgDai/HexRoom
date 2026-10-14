import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import NavbarRentalManagements from './Navbar_rentalManagements';
import SidebarRentalManagements from './Sidebar_rentalManagements';

const SIDEBAR_WIDTH = 264;
const SIDEBAR_COLLAPSED = 76;

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

export default function LayoutRentalManagements() {
    const [open, setOpen] = useState(true);
    const isDesktop = useDesktop();
    const leftOffset = isDesktop ? (open ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED) : 0;

    return (
        <div className="min-h-screen bg-background">
            <NavbarRentalManagements
                onToggleDrawer={() => setOpen((prev) => !prev)}
                isSidebarOpen={open}
                sidebarWidth={SIDEBAR_WIDTH}
                collapsedWidth={SIDEBAR_COLLAPSED}
                showSearch
            />

            <SidebarRentalManagements
                open={open}
                onToggle={() => setOpen((prev) => !prev)}
                sidebarWidth={SIDEBAR_WIDTH}
                collapsedWidth={SIDEBAR_COLLAPSED}
            />

            <main
                className="min-h-screen pt-20 px-4 pb-8 sm:px-6 lg:px-8"
                style={{
                    marginLeft: leftOffset,
                    transition: 'margin-left 220ms ease',
                }}
            >
                <Outlet />
            </main>
        </div>
    );
}
