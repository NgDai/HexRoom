import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, theme, Avatar, Dropdown, Button } from 'antd';
import type { MenuProps } from 'antd';
import {
    DashboardOutlined,
    GlobalOutlined,
    UserOutlined,
    HomeOutlined,
    EnvironmentOutlined,
    AppstoreOutlined,
    WalletOutlined,
    DollarCircleOutlined,
    TeamOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    LogoutOutlined,
    SettingOutlined,
    LockOutlined,
    BookOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/app/context/useAuth';
import { useTranslation } from 'react-i18next';

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
    label: React.ReactNode,
    key: string,
    icon?: React.ReactNode,
    children?: MenuItem[]
): MenuItem {
    return { label, key, icon, children } as MenuItem;
}

export function AdminLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [manualOpenKeys, setManualOpenKeys] = useState<string[] | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, signOut } = useAuth();
    const { t, i18n } = useTranslation();
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const menuItems: MenuItem[] = [
        getItem(t('admin.menu.dashboard'), '/admin', <DashboardOutlined />),
        getItem(t('admin.menu.users'), '/admin/users', <UserOutlined />),
        getItem(t('admin.menu.rentals'), '/admin/rentals', <HomeOutlined />),
        getItem(t('admin.menu.blogs'), '/admin/blogs', <BookOutlined />),
        getItem(t('admin.menu.wallets'), '/admin/wallets', <WalletOutlined />),
        getItem(t('admin.menu.reportsGroup'), 'reports-group', <DollarCircleOutlined />, [
            getItem(t('admin.menu.finance'), '/admin/finance', <DollarCircleOutlined />),
            getItem(t('admin.menu.moderatorKpis'), '/admin/moderators', <TeamOutlined />),
        ]),
        getItem(t('admin.menu.settingsGroup'), 'settings-group', <SettingOutlined />, [
            getItem(t('admin.menu.locations'), '/admin/locations', <EnvironmentOutlined />),
            getItem(t('admin.menu.amenities'), '/admin/amenities', <AppstoreOutlined />),
            getItem(t('admin.menu.vipPackages'), '/admin/vip', <SettingOutlined />),
            getItem(t('admin.menu.systemSettings'), '/admin/settings', <SettingOutlined />),
            getItem(t('admin.menu.homeConfig'), '/admin/home-config', <HomeOutlined />),
        ]),
    ];

    const handleMenuClick = (e: { key: string }) => {
        if (e.key.startsWith('/')) {
            setManualOpenKeys(null);
            navigate(e.key);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const userMenuItems: MenuProps['items'] = [
        {
            key: 'change-password',
            icon: <LockOutlined />,
            label: t('admin.userMenu.changePassword'),
            onClick: () => navigate('/profile'),
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: t('admin.userMenu.logout'),
            onClick: handleLogout,
            danger: true,
        },
    ];

    const selectedKey = location.pathname.startsWith('/admin/users')
        ? '/admin/users'
        : location.pathname.startsWith('/admin/finance')
            ? '/admin/finance'
            : location.pathname.startsWith('/admin/moderators')
                ? '/admin/moderators'
                : location.pathname.startsWith('/admin/rentals')
                    ? '/admin/rentals'
                    : location.pathname.startsWith('/admin/blogs')
                        ? '/admin/blogs'
                        : location.pathname.startsWith('/admin/wallets')
                            ? '/admin/wallets'
                            : location.pathname.startsWith('/admin/locations')
                                ? '/admin/locations'
                                : location.pathname.startsWith('/admin/amenities')
                                    ? '/admin/amenities'
                                    : location.pathname.startsWith('/admin/vip')
                                        ? '/admin/vip'
                                        : location.pathname.startsWith('/admin/settings')
                                            ? '/admin/settings'
                                            : location.pathname.startsWith('/admin/home-config')
                                                ? '/admin/home-config'
                                                : '/admin';
    const autoOpenKeys = selectedKey.startsWith('/admin/finance') || selectedKey.startsWith('/admin/moderators')
        ? ['reports-group']
        : selectedKey.startsWith('/admin/locations') || selectedKey.startsWith('/admin/amenities') || selectedKey.startsWith('/admin/settings')
            || selectedKey.startsWith('/admin/vip') || selectedKey.startsWith('/admin/home-config')
            ? ['settings-group']
            : [];
    const openKeys = manualOpenKeys ?? autoOpenKeys;

    const currentLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'vi';
    const nextLanguage = currentLanguage === 'vi' ? 'en' : 'vi';

    const toggleLanguage = async () => {
        await i18n.changeLanguage(nextLanguage);
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                }}
            >
                <div
                    style={{
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: collapsed ? 16 : 20,
                        fontWeight: 'bold',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    {collapsed ? 'EZ' : t('admin.brand')}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    openKeys={openKeys}
                    items={menuItems}
                    onOpenChange={(keys) => setManualOpenKeys(keys as string[])}
                    onClick={handleMenuClick}
                />
            </Sider>
            <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s' }}>
                <Header
                    style={{
                        padding: '0 24px',
                        background: colorBgContainer,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    }}
                >
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: 16, width: 48, height: 48 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Button
                            type="text"
                            icon={<GlobalOutlined />}
                            onClick={() => void toggleLanguage()}
                            title={t('admin.language.toggleTitle')}
                        >
                            {currentLanguage.toUpperCase()} / {nextLanguage.toUpperCase()}
                        </Button>
                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    cursor: 'pointer',
                                }}
                            >
                                <Avatar
                                    src={user?.avatarUrl}
                                    icon={!user?.avatarUrl && <UserOutlined />}
                                    style={{ backgroundColor: '#1677ff' }}
                                />
                                <span style={{ fontWeight: 500 }}>
                                    {user?.fullName || user?.email || t('admin.defaultUser')}
                                </span>
                            </div>
                        </Dropdown>
                    </div>
                </Header>
                <Content
                    style={{
                        margin: 24,
                        padding: 24,
                        minHeight: 280,
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                    }}
                >
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
