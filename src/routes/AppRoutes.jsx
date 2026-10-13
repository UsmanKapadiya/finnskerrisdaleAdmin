import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AdminLayout from '../layouts/AdminLayout';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import NotFoundPage from '../pages/NotFoundPage';
import { Spinner } from '../components/UI';

const PostsPage = lazy(() => import('../pages/Posts/PostsPage'));
const PostEditPage = lazy(() => import('../pages/Posts/PostEditPage'));
const PagesPage = lazy(() => import('../pages/Pages/PagesPage'));
const PageEditPage = lazy(() => import('../pages/Pages/PageEditPage'));
const TaxonomyPage = lazy(() => import('../pages/Taxonomy/TaxonomyPage'));
const BrandsPage = lazy(() => import('../pages/Brands/BrandsPage'));
const GalleriesPage = lazy(() => import('../pages/Galleries/GalleriesPage'));
const GalleryEditPage = lazy(() => import('../pages/Galleries/GalleryEditPage'));
const MediaPage = lazy(() => import('../pages/Media/MediaPage'));
const MessagesPage = lazy(() => import('../pages/Inbox/MessagesPage'));
const SubscribersPage = lazy(() => import('../pages/Inbox/SubscribersPage'));
const MenuPage = lazy(() => import('../pages/Site/MenuPage'));
const RedirectsPage = lazy(() => import('../pages/Site/RedirectsPage'));
const UsersPage = lazy(() => import('../pages/Site/UsersPage'));
const SettingsPage = lazy(() => import('../pages/Site/SettingsPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));

function RequireAuth({ children }) {
  const { user, ready, signedOut } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="center fill"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace state={signedOut ? undefined : { from: location.pathname + location.search }} />;
  return children;
}

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <div className="empty-state">
        <h3>Admins only</h3>
        <p>Ask an administrator if you need access to this area.</p>
      </div>
    );
  }
  return children;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="center pad"><Spinner /></div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="posts" element={<PostsPage />} />
          <Route path="posts/:id" element={<PostEditPage />} />
          <Route path="pages" element={<PagesPage />} />
          <Route path="pages/:id" element={<PageEditPage />} />
          <Route path="categories" element={<TaxonomyPage key="categories" kind="categories" />} />
          <Route path="tags" element={<TaxonomyPage key="tags" kind="tags" />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="galleries" element={<GalleriesPage />} />
          <Route path="galleries/:id" element={<GalleryEditPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="contact-submissions" element={<MessagesPage />} />
          <Route path="subscribers" element={<SubscribersPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="menu" element={<RequireAdmin><MenuPage /></RequireAdmin>} />
          <Route path="redirects" element={<RequireAdmin><RedirectsPage /></RequireAdmin>} />
          <Route path="users" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
          <Route path="settings" element={<RequireAdmin><SettingsPage /></RequireAdmin>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
