import { Link, useLocation } from 'wouter';
import { Library, Users, Layers, Tag, Building2, Languages } from 'lucide-react';
import styles from './Sidebar.module.css';

const NAV = [
  { href: '/', label: 'Library', icon: Library, exact: true },
  { href: '/authors', label: 'Authors', icon: Users },
  { href: '/series', label: 'Series', icon: Layers },
  { href: '/tags', label: 'Tags', icon: Tag },
  { href: '/publishers', label: 'Publishers', icon: Building2 },
  { href: '/languages', label: 'Languages', icon: Languages },
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

  return (
    <>
      {open && <div className={styles.scrim} onClick={onNavigate} aria-hidden="true" />}
      <nav
        className={open ? styles.navOpen : styles.nav}
        aria-label="Browse"
      >
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
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
