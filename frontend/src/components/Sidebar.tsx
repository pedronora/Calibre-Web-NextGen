import { Link, useLocation } from 'wouter';
import {
  Library, Users, Layers, Tag, Building2, Languages, BookCopy, UploadCloud, Shield,
  Flame, Shuffle, Star, Archive, Info, ListChecks,
} from 'lucide-react';
import { useShelves, useMe } from '../lib/queries';
import { useT } from '../lib/i18n';
import styles from './Sidebar.module.css';

const NAV = [
  { href: '/', label: 'Library', icon: Library, exact: true },
  { href: '/authors', label: 'Authors', icon: Users },
  { href: '/series', label: 'Series', icon: Layers },
  { href: '/tags', label: 'Tags', icon: Tag },
  { href: '/publishers', label: 'Publishers', icon: Building2 },
  { href: '/languages', label: 'Languages', icon: Languages },
];

// Discovery views — fixed server-side filter categories (parity with the
// legacy sidebar's Hot/Discover/Rated + per-user Favorites/Archived).
const DISCOVER = [
  { href: '/favorites', label: 'Favorites', icon: Star },
  { href: '/hot', label: 'Hot', icon: Flame },
  { href: '/discover', label: 'Discover', icon: Shuffle },
  { href: '/rated', label: 'Top Rated', icon: Star },
  { href: '/archived', label: 'Archived', icon: Archive },
];

// Lower-frequency info pages.
const SYSTEM = [
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/about', label: 'About', icon: Info },
];

function isActive(location: string, href: string, exact?: boolean): boolean {
  if (exact) return location === href;
  return location === href || location.startsWith(href + '/');
}

interface SidebarProps {
  /** Mobile drawer open state. Ignored on desktop (always visible). */
  open: boolean;
  onNavigate: () => void;
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const [location] = useLocation();
  const t = useT();
  const { data: shelvesData } = useShelves();
  const shelves = shelvesData?.items ?? [];
  const me = useMe().data;
  const canUpload = !!me?.role?.upload;
  const isAdmin = !!me?.role?.admin;

  return (
    <>
      {open && <div className={styles.scrim} onClick={onNavigate} aria-hidden="true" />}
      <nav className={open ? styles.navOpen : styles.nav} aria-label="Browse">
        <ul className={styles.list}>
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(location, href, exact);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={active ? styles.itemActive : styles.item}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                >
                  <Icon size={18} className={styles.icon} />
                  <span>{t(label)}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <ul className={styles.list}>
          {DISCOVER.map(({ href, label, icon: Icon }) => {
            const active = isActive(location, href, true);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={active ? styles.itemActive : styles.item}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                >
                  <Icon size={18} className={styles.icon} />
                  <span>{t(label)}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {(canUpload || isAdmin) && (
          <ul className={styles.list}>
            {canUpload && (
              <li>
                <Link
                  href="/upload"
                  className={isActive(location, '/upload', true) ? styles.itemActive : styles.item}
                  aria-current={isActive(location, '/upload', true) ? 'page' : undefined}
                  onClick={onNavigate}
                >
                  <UploadCloud size={18} className={styles.icon} />
                  <span>{t('Upload')}</span>
                </Link>
              </li>
            )}
            {isAdmin && (
              <li>
                <Link
                  href="/admin"
                  className={isActive(location, '/admin', true) ? styles.itemActive : styles.item}
                  aria-current={isActive(location, '/admin', true) ? 'page' : undefined}
                  onClick={onNavigate}
                >
                  <Shield size={18} className={styles.icon} />
                  <span>{t('Admin')}</span>
                </Link>
              </li>
            )}
          </ul>
        )}

        {/* Shelves: header links to the manage page; user's shelves listed below. */}
        <div className={styles.sectionHeader}>
          <Link
            href="/shelves"
            className={isActive(location, '/shelves', true) ? styles.sectionTitleActive : styles.sectionTitle}
            onClick={onNavigate}
          >
            <BookCopy size={16} className={styles.icon} />
            <span>{t('Shelves')}</span>
          </Link>
        </div>

        <ul className={styles.list}>
          {SYSTEM.map(({ href, label, icon: Icon }) => {
            const active = isActive(location, href, true);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={active ? styles.itemActive : styles.item}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                >
                  <Icon size={18} className={styles.icon} />
                  <span>{t(label)}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {shelves.length > 0 && (
          <ul className={styles.shelfList}>
            {shelves.map((s) => {
              const href = `/shelf/${s.id}`;
              const active = location === href;
              return (
                <li key={s.id}>
                  <Link
                    href={href}
                    className={active ? styles.shelfItemActive : styles.shelfItem}
                    aria-current={active ? 'page' : undefined}
                    onClick={onNavigate}
                    title={s.name}
                  >
                    <span className={styles.shelfName}>{s.name}</span>
                    <span className={styles.shelfCount}>{s.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </>
  );
}
