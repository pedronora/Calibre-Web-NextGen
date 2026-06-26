import { BookMarked, LogOut, Menu } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from './Button';
import styles from './TopBar.module.css';

interface TopBarProps {
  userName: string;
  onLogout: () => void;
  onMenu?: () => void;
}

export function TopBar({ userName, onLogout, onMenu }: TopBarProps) {
  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        {onMenu && (
          <button className={styles.menuBtn} onClick={onMenu} aria-label="Open navigation">
            <Menu size={20} />
          </button>
        )}
        <Link href="/" className={styles.brand}>
          <BookMarked size={22} className={styles.brandIcon} />
          <span className={styles.brandText}>
            <span className={styles.brandMain}>Calibre-Web </span>
            <span className={styles.brandAccent}>NextGen</span>
          </span>
        </Link>
      </div>
      <div className={styles.right}>
        <span className={styles.userName}>{userName}</span>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          <LogOut size={16} />
          Sign out
        </Button>
      </div>
    </header>
  );
}
