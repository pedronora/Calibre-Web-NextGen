import { Check, X } from 'lucide-react';
import { Link } from 'wouter';
import type { Book } from '../lib/api';
import { BookCover } from './BookCover';
import styles from './BookCard.module.css';

interface BookCardProps {
  book: Book;
  style?: React.CSSProperties;
  /** When provided, a remove (×) control is shown on the cover (e.g. on a shelf). */
  onRemove?: (book: Book) => void;
  removeLabel?: string;
}

export function BookCard({ book, style, onRemove, removeLabel = 'Remove' }: BookCardProps) {
  const authorStr = book.authors.join(', ');

  return (
    <Link href={`/book/${book.id}`} className={styles.cardLink}>
      <article className={styles.card} style={style} tabIndex={0}>
        <div className={styles.coverWrap}>
          <BookCover coverUrl={book.cover_url} title={book.title} />
          {book.read && (
            <span className={styles.readBadge} aria-label="Read" title="Read">
              <Check size={14} strokeWidth={3} />
            </span>
          )}
          {onRemove && (
            <button
              type="button"
              className={styles.removeBtn}
              aria-label={removeLabel}
              title={removeLabel}
              onClick={(e) => {
                // The card is wrapped in a Link — stop the click from navigating.
                e.preventDefault();
                e.stopPropagation();
                onRemove(book);
              }}
            >
              <X size={14} strokeWidth={3} />
            </button>
          )}
        </div>
        <div className={styles.info}>
          <p className={styles.title}>{book.title}</p>
          <p className={styles.author}>{authorStr}</p>
        </div>
      </article>
    </Link>
  );
}
