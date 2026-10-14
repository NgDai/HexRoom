import { AccountPage } from '@/app/features/hexroom/AccountPage';
import { RoommateDiscoveryPage } from '@/app/features/hexroom/RoommateDiscoveryPage';
import { RoomTransparencyPage } from '@/app/features/hexroom/RoomTransparencyPage';
import { HowItWorksPage } from '@/app/features/hexroom/HowItWorksPage';
import { WorkspacePage } from '@/app/features/hexroom/WorkspacePage';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, redirect, RouterProvider } from 'react-router-dom';
import { HomePage } from '@/app/features/home';
import { SearchPage } from '@/app/features/search';
import { RoomsPage } from '@/app/features/rooms';
import { FindRoommatePage } from '@/app/features/roommate';
import { BrowsePage } from '@/app/features/browse';
import { RentalDetailPage } from '@/app/features/rental-detail';
import { LoginPage, ForgotPasswordPage, ResetPasswordPage, CompleteSignupPage, OAuthCallbackPage } from '@/app/features/auth';
import { RegisterPage } from '@/app/features/common';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { PageLoader } from '@/app/components/PageLoader';
import { PayOSResultPage, WalletPaymentResultPage } from '@/app/features/payment-result';
import { VipPlansPage, VipManagementPage } from '@/app/features/vip';
import { BlogListPage, BlogDetailPage } from '@/app/features/blog';

/* Lazy-loaded chunks – admin/moderator/rental-mgmt only loaded when visited */
const BookingHistoryPage = lazy(() => import('@/app/features/booking-history').then((m) => ({ default: m.BookingHistoryPage })));
const FavoritesPage = lazy(() => import('@/app/features/favorites').then((m) => ({ default: m.default })));
const LayoutRentalManagements = lazy(() => import('@/app/layouts/layout_rentalManagements/Layout_rentalManagements').then((m) => ({ default: m.default })));
const CreateRentalPage = lazy(() => import('@/app/features/rentalManagement/create_Rental').then((m) => ({ default: m.CreateRentalPage })));
const ViewListRentalPage = lazy(() => import('@/app/features/rentalManagement/ViewListRental').then((m) => ({ default: m.ViewListRentalPage })));
const ViewRentalDetailPage = lazy(() => import('@/app/features/rentalManagement/ViewRentalDetail').then((m) => ({ default: m.ViewRentalDetailPage })));
const LandlordDashboardPage = lazy(() => import('@/app/features/rentalManagement').then((m) => ({ default: m.LandlordDashboardPage })));
const CreateRoomPostPage = lazy(() => import('@/app/features/roomManagement').then((m) => ({ default: m.CreateRoomPostPage })));
const ViewListRoomPostPage = lazy(() => import('@/app/features/roomManagement').then((m) => ({ default: m.ViewListRoomPostPage })));
const ViewRoomPostDetailPage = lazy(() => import('@/app/features/roomManagement').then((m) => ({ default: m.ViewRoomPostDetailPage })));
const RequestsPage = lazy(() => import('@/app/features/rentalManagement/requests').then((m) => ({ default: m.RequestsPage })));
const ReviewsPage = lazy(() => import('@/app/features/rentalManagement/reviews').then((m) => ({ default: m.ReviewsPage })));
const TenantReviewsPage = lazy(() => import('@/app/features/rentalManagement').then((m) => ({ default: m.TenantReviewsPage })));
const EditRentalPage = lazy(() => import('@/app/features/rentalManagement/EditRental/EditRentalPage').then((m) => ({ default: m.EditRentalPage })));
const EditRoomPostPage = lazy(() => import('@/app/features/roomManagement/EditRoomPost/EditRoomPostPage').then((m) => ({ default: m.EditRoomPostPage })));
const HandleReportsPage = lazy(() => import('@/app/features/moderator/handle-reports').then((m) => ({ default: m.HandleReportsPage })));
const ModerateRentalListPage = lazy(() => import('@/app/features/moderator/moderate-rental').then((m) => ({ default: m.ModerateRentalListPage })));
const ModerateReviewsPage = lazy(() => import('@/app/features/moderator/moderate-reviews').then((m) => ({ default: m.ModerateReviewsPage })));
const ModerateRoomPostListPage = lazy(() => import('@/app/features/moderator/moderateRoomPost').then((m) => ({ default: m.ModerateRoomPostListPage })));
const ModeratorDashboardPage = lazy(() => import('@/app/features/moderator').then((m) => ({ default: m.ModeratorDashboardPage })));
const ModerationQueuePage = lazy(() => import('@/app/features/moderator/moderation-queue').then((m) => ({ default: m.ModerationQueuePage })));
const TenantLandlordListPage = lazy(() => import('@/app/features/moderator/tenant-landlord').then((m) => ({ default: m.TenantLandlordListPage })));
const AdminLayout = lazy(() => import('@/app/features/admin').then((m) => ({ default: m.AdminLayout })));
const AdminDashboardPage = lazy(() => import('@/app/features/admin').then((m) => ({ default: m.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import('@/app/features/admin').then((m) => ({ default: m.AdminUsersPage })));
const AdminRentalsPage = lazy(() => import('@/app/features/admin').then((m) => ({ default: m.AdminRentalsPage })));
const AdminAmenitiesPage = lazy(() => import('@/app/features/admin').then((m) => ({ default: m.AdminAmenitiesPage })));
const AdminLocationsPage = lazy(() => import('@/app/features/admin').then((m) => ({ default: m.AdminLocationsPage })));
const AdminWalletsPage = lazy(() => import('@/app/features/admin').then((m) => ({ default: m.AdminWalletsPage })));
const AdminFinancePage = lazy(() => import('@/app/features/admin').then((m) => ({ default: m.AdminFinancePage })));
const AdminSettingsPage = lazy(() => import('@/app/features/admin').then((m) => ({ default: m.AdminSettingsPage })));
const AdminModeratorsPage = lazy(() => import('@/app/features/admin').then((m) => ({ default: m.AdminModeratorsPage })));
const AdminBlogPostsPage = lazy(() => import('@/app/features/admin').then((m) => ({ default: m.AdminBlogPostsPage })));
const AdminVipPackagesPage = lazy(() => import('@/app/features/admin').then((m) => ({ default: m.AdminVipPackagesPage })));
const AdminHomeConfigPage = lazy(() => import('@/app/features/admin').then((m) => ({ default: m.AdminHomeConfigPage })));
const LayoutModerator = lazy(() => import('@/app/layouts/layout_moderator/LayoutModerator').then((m) => ({ default: m.default })));
const ViewLandlordPage = lazy(() => import('@/app/features/lanlord-page').then((m) => ({ default: m.ViewLandlordPage })));
const ChatPage = lazy(() => import('@/app/features/chat').then((m) => ({ default: m.ChatPage })));
const WalletPage = lazy(() => import('@/app/features/wallet').then((m) => ({ default: m.WalletPage })));

const routes = [
    { path: '/how-it-works', element: <HowItWorksPage /> },
    { path: '/workspace', element: <ProtectedRoute><WorkspacePage /></ProtectedRoute> },
    { path: '/post-room', element: <ProtectedRoute><WorkspacePage /></ProtectedRoute> },
    {
        path: '/',
        loader: () => redirect('/home'),
    },
    {
        path: '/register',
        element: <RegisterPage />,
    },
    {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
    },
    {
        path: '/reset-password',
        element: <ResetPasswordPage />,
    },
    {
        path: '/complete-signup',
        element: <CompleteSignupPage />,
    },
    {
        path: '/auth/callback',
        element: <OAuthCallbackPage />,
    },
    {
        path: '/home',
        element: <HomePage />,
    },
    {
        path: '/blog',
        element: <BlogListPage />,
    },
    {
        path: '/blog/:slug',
        element: <BlogDetailPage />,
    },
    {
        path: '/search',
        element: <SearchPage />,
    },
    {
        path: '/vip-plans',
        element: <VipPlansPage />,
    },
    {
        path: '/vip/plans',
        loader: () => redirect('/vip-plans'),
    },
    {
        path: '/vip-management',
        element: (
            <ProtectedRoute requireVip>
                <VipManagementPage />
            </ProtectedRoute>
        ),
    },
    {
        path: '/rooms',
        element: <RoomsPage />,
    },
    {
        path: '/browse',
        element: <BrowsePage />,
    },
    {
        path: '/history',
        element: (
            <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                    <BookingHistoryPage />
                </Suspense>
            </ProtectedRoute>
        ),
    },
    {
        path: '/favorites',
        element: (
            <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                    <FavoritesPage />
                </Suspense>
            </ProtectedRoute>
        ),
    },
    {
        path: '/profile',
        element: (
            <ProtectedRoute>
                <AccountPage />
            </ProtectedRoute>
        ),
    },
     {
        path: '/wallet',
        element: (
            <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                    <WalletPage />
                </Suspense>
            </ProtectedRoute>
        ),
    },
    {
        path: '/wallet',
        element: (
            <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                    <WalletPage />
                </Suspense>
            </ProtectedRoute>
        ),
    },
    {
        path: '/roommate',
        element: (
            <>
                <Suspense fallback={<PageLoader />}>
                    <FindRoommatePage />
                </Suspense>
            </>
        ),
    },
    {
        path: '/login',
        element: <LoginPage />,
    },
      {
        path: '/chat',
        element: (
            <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                    <ChatPage />
                </Suspense>
            </ProtectedRoute>
        ),
    },
    {
        path: '/chat/:userId',
        element: (
            <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                    <ChatPage />
                </Suspense>
            </ProtectedRoute>
        ),
    },
    {
        path: '/rental-management',
        element: (
            <ProtectedRoute requiredRole="LANDLORD">
                <Suspense fallback={<PageLoader />}>
                    <LayoutRentalManagements />
                </Suspense>
            </ProtectedRoute>
        ),
        children: [
            { index: true, loader: () => redirect('dashboard') },
            { path: 'dashboard', element: <Suspense fallback={<PageLoader />}><LandlordDashboardPage /></Suspense> },
            { path: 'rentals', element: <Suspense fallback={<PageLoader />}><ViewListRentalPage /></Suspense> },
            { path: 'rentals/create', element: <Suspense fallback={<PageLoader />}><CreateRentalPage /></Suspense> },
            { path: 'rentals/:rentalId', element: <Suspense fallback={<PageLoader />}><ViewRentalDetailPage /></Suspense> },
            { path: 'rentals/:rentalId/edit', element: <Suspense fallback={<PageLoader />}><EditRentalPage /></Suspense> },
            { path: 'rentals/:rentalId/room-posts', element: <Suspense fallback={<PageLoader />}><ViewListRoomPostPage /></Suspense> },
            { path: 'rentals/:rentalId/room-posts/create', element: <Suspense fallback={<PageLoader />}><CreateRoomPostPage /></Suspense> },
            { path: 'rentals/:rentalId/room-posts/:roomPostId', element: <Suspense fallback={<PageLoader />}><ViewRoomPostDetailPage /></Suspense> },
            { path: 'rentals/:rentalId/room-posts/:roomPostId/edit', element: <Suspense fallback={<PageLoader />}><EditRoomPostPage /></Suspense> },
            { path: 'requests', element: <Suspense fallback={<PageLoader />}><RequestsPage /></Suspense> },
            { path: 'reviews', element: <Suspense fallback={<PageLoader />}><ReviewsPage /></Suspense> },
            { path: 'tenant-reviews', element: <Suspense fallback={<PageLoader />}><TenantReviewsPage /></Suspense> },
            { path: 'wallet', element: <Suspense fallback={<PageLoader />}><WalletPage /></Suspense> },
            { path: 'messages', element: <Suspense fallback={<PageLoader />}><ChatPage /></Suspense> },
            { path: 'messages/:userId', element: <Suspense fallback={<PageLoader />}><ChatPage /></Suspense> },
        ],
    },
    {
        path: '/rental/:id',
        element: <RentalDetailPage />,
    },
    {
        path: '/landlord/:id',
        element: (
            <Suspense fallback={<PageLoader />}>
                <ViewLandlordPage />
            </Suspense>
        ),
    },
    {
        path: '/room/:id',
        element: <RoomTransparencyPage />,
    },
    {
        path: '/payment/payos-result',
        element: <PayOSResultPage />,
    },
    {
        path: '/payment-success',
        element: <WalletPaymentResultPage />,
    },
    {
        path: '/payment-cancel',
        element: <WalletPaymentResultPage isCancel />,
    },
    {
        path: '/moderator',
        element: (
            <ProtectedRoute requiredRole={['MODERATOR', 'ADMIN']}>
                <Suspense fallback={<PageLoader />}>
                    <LayoutModerator />
                </Suspense>
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <Suspense fallback={<PageLoader />}><ModeratorDashboardPage /></Suspense> },
            { path: 'queue', element: <Suspense fallback={<PageLoader />}><ModerationQueuePage /></Suspense> },
            { path: 'rentals', element: <Suspense fallback={<PageLoader />}><ModerateRentalListPage /></Suspense> },
            { path: 'room-posts', element: <Suspense fallback={<PageLoader />}><ModerateRoomPostListPage /></Suspense> },
            { path: 'reports', element: <Suspense fallback={<PageLoader />}><HandleReportsPage /></Suspense> },
            { path: 'reviews', element: <Suspense fallback={<PageLoader />}><ModerateReviewsPage /></Suspense> },
            { path: 'users', element: <Suspense fallback={<PageLoader />}><TenantLandlordListPage /></Suspense> },
        ],
    },
    {
        path: '/admin',
        element: (
            <ProtectedRoute requiredRole="ADMIN">
                <Suspense fallback={<PageLoader />}>
                    <AdminLayout />
                </Suspense>
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <Suspense fallback={<PageLoader />}><AdminDashboardPage /></Suspense> },
            { path: 'users', element: <Suspense fallback={<PageLoader />}><AdminUsersPage /></Suspense> },
            { path: 'finance', element: <Suspense fallback={<PageLoader />}><AdminFinancePage /></Suspense> },
            { path: 'moderators', element: <Suspense fallback={<PageLoader />}><AdminModeratorsPage /></Suspense> },
            { path: 'rentals', element: <Suspense fallback={<PageLoader />}><AdminRentalsPage /></Suspense> },
            { path: 'amenities', element: <Suspense fallback={<PageLoader />}><AdminAmenitiesPage /></Suspense> },
            { path: 'locations', element: <Suspense fallback={<PageLoader />}><AdminLocationsPage /></Suspense> },
            { path: 'wallets', element: <Suspense fallback={<PageLoader />}><AdminWalletsPage /></Suspense> },
            { path: 'settings', element: <Suspense fallback={<PageLoader />}><AdminSettingsPage /></Suspense> },
            { path: 'home-config', element: <Suspense fallback={<PageLoader />}><AdminHomeConfigPage /></Suspense> },
            { path: 'blogs', element: <Suspense fallback={<PageLoader />}><AdminBlogPostsPage /></Suspense> },
            { path: 'vip', element: <Suspense fallback={<PageLoader />}><AdminVipPackagesPage /></Suspense> },
        ],
    },
    // 404 catch-all — prevents unknown URLs from hitting the default ErrorBoundary
    {
        path: '*',
        element: (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-center px-4">
                <p className="text-6xl font-bold text-muted-foreground">404</p>
                <p className="text-xl font-semibold text-foreground">Trang không tồn tại</p>
                <p className="text-muted-foreground text-sm">Đường dẫn bạn truy cập không hợp lệ.</p>
                <a href="/home" className="mt-2 inline-flex items-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
                    Về trang chủ
                </a>
            </div>
        ),
    },
];

// Router is created once at module level - creating it inside a component or useMemo
// causes it to be recreated on re-renders and triggers ErrorResponseImpl errors.
const router = createBrowserRouter(routes);

export function AppRouter() {
    return <RouterProvider router={router} />;
}
