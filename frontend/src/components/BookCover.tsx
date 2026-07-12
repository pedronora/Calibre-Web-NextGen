import { resourceUrl } from '../lib/api';
import styles from './BookCover.module.css';

interface BookCoverProps {
  coverUrl?: string | null;
  title: string;
  authors?: string[];
}

export function BookCover({ coverUrl, title, authors }: BookCoverProps) {
  if (coverUrl) {
    return (
      <div className={styles.wrap}>
        <img
          src={resourceUrl(coverUrl)}
          alt={title}
          loading="lazy"
          className={styles.img}
        />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.fallback} aria-label={title}>
        <span className={styles.fallbackTitle}>{title}</span>
        {authors?.[0] && <span className={styles.fallbackAuthor}>{authors[0]}</span>}
        <span className={styles.fallbackMark} aria-hidden="true">NextGen</span>
      </div>
    </div>
  );
}
