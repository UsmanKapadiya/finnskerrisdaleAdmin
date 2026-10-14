import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api, SITE_URL } from '../services/api';
import { useToast } from '../hooks/useToast';
import { setFavicon } from '../utils/favicon';

const NAV = [
  { group: null, items: [{ to: '/dashboard', label: 'Dashboard', icon: '◧' }] },
  {
    group: 'Content',
    items: [
      { to: '/posts', label: 'Posts', icon: '✎' },
      { to: '/pages', label: 'Pages', icon: '▤' },
      { to: '/categories', label: 'Categories', icon: '◫' },
      { to: '/tags', label: 'Tags', icon: '#' },
      { to: '/brands', label: 'Designers', icon: '◇' },
      { to: '/galleries', label: 'Galleries', icon: '▦' },
      { to: '/media', label: 'Media library', icon: '◩' },
    ],
  },
  {
    group: 'Inbox',
    items: [
      { to: '/contact-submissions', label: 'Messages', icon: '✉' },
      { to: '/subscribers', label: 'Subscribers', icon: '☺' },
    ],
  },
  {
    group: 'Site',
    adminOnly: true,
    items: [
      { to: '/menu', label: 'Menu', icon: '☰' },
      { to: '/redirects', label: 'Redirects', icon: '↪' },
      { to: '/users', label: 'Users', icon: '♟' },
      { to: '/settings', label: 'Settings', icon: '⚙' },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout, isAdmin } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!isAdmin) return;
    api.get('/admin/settings')
      .then((res) => {
        const setting = Object.values(res.data).flat().find((item) => item.key === 'favicon_url');
        setFavicon(setting?.value || null);
      })
      .catch((err) => toast(`Could not load the admin favicon: ${err.message}`, 'error'));
  }, [isAdmin, toast]);

  return (
    <div className={`admin ${open ? 'nav-open' : ''}`}>
      <aside className="sidebar" aria-label="Admin navigation">
        <div className="brand">
          <span className="brand-mark">FKL</span>
          <span className="brand-name">Finns Kerrisdale<small>Admin</small></span>
        </div>
        <nav>
          {NAV.filter((g) => !g.adminOnly || isAdmin).map((g) => (
            <div key={g.group || 'main'} className="nav-group">
              {g.group && <div className="nav-group-label">{g.group}</div>}
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span className="nav-icon" aria-hidden="true">{it.icon}</span>
                  {it.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <a className="nav-link view-site" href={SITE_URL} target="_blank" rel="noopener noreferrer">
          <span className="nav-icon" aria-hidden="true">↗</span>View website
        </a>
      </aside>
      <div className="sidebar-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}>☰</button>
          <div className="topbar-spacer" />
          <NavLink to="/profile" className="topbar-user" title="Your profile">
            <span className="avatar" aria-hidden="true">{(user?.name || '?').slice(0, 1).toUpperCase()}</span>
            <span className="topbar-user-name">{user?.name}<small>{user?.role}</small></span>
          </NavLink>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>Log out</button>
        </header>
        <main className="content" id="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
