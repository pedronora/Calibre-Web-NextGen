import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronLeft, Globe, Lock, Pencil, Trash2, Check, X } from 'lucide-react';
import { useShelf, useUpdateShelf, useDeleteShelf, useShelfMembership } from '../lib/queries';
import { BookCard } from '../components/BookCard';
import { Button } from '../components/Button';
import { Spinner, SpinnerCentered } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import type { Book } from '../lib/api';
import { ApiError } from '../lib/api';
import styles from './Shelf.module.css';

function dedupAppend(prev: Book[], next: Book[]): Book[] {
  const seen = new Set(prev.map((b) => b.id));
  const fresh = next.filter((b) => !seen.has(b.id));
  return fresh.length ? [...prev, ...fresh] : prev;
}

export function Shelf({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [books, setBooks] = useState<Book[]>([]);
  const accKeyRef = useRef<string>('');

  const { data, isLoading, isFetching, error } = useShelf(id, page);
  const updateShelf = useUpdateShelf(id);
  const deleteShelf = useDeleteShelf();
  const { remove } = useShelfMembership();

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Reset accumulation if the shelf id changes (route reuse) or membership shrinks.
  useEffect(() => {
    if (!data) return;
    const key = String(id);
    if (key !== accKeyRef.current) {
      setBooks(data.items);
      accKeyRef.current = key;
    } else {
      setBooks((prev) => dedupAppend(prev, data.items));
    }
  }, [data, id]);

  if (isLoading && !data) return <SpinnerCentered size={40} />;
  if (error || !data) {
    return (
      <main className={styles.container}>
        <Link href="/shelves" className={styles.back}>
          <ChevronLeft size={16} /> All shelves
        </Link>
        <EmptyState message={error instanceof Error ? error.message : 'Shelf not found.'} />
      </main>
    );
  }

  const total = data.total;
  const hasMore = books.length < total;
  const canEdit = data.can_edit;

  const startRename = () => {
    setDraftName(data.name);
    setEditing(true);
    setActionError(null);
  };

  const saveRename = () => {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === data.name) {
      setEditing(false);
      return;
    }
    updateShelf.mutate(
      { name: trimmed },
      {
        onSuccess: () => setEditing(false),
        onError: (err) =>
          setActionError(err instanceof ApiError ? err.message : 'Could not rename shelf.'),
      },
    );
  };

  const onDelete = () => {
    if (!window.confirm(`Delete shelf "${data.name}"? This cannot be undone.`)) return;
    deleteShelf.mutate(Number(id), {
      onSuccess: () => navigate('/shelves'),
      onError: (err) =>
        setActionError(err instanceof ApiError ? err.message : 'Could not delete shelf.'),
    });
  };

  const onRemoveBook = (book: Book) => {
    // Optimistically drop from the local list; the query invalidation reconciles.
    setBooks((prev) => prev.filter((b) => b.id !== book.id));
    remove.mutate({ shelfId: Number(id), bookId: book.id });
  };

  return (
    <main className={styles.container}>
      <Link href="/shelves" className={styles.back}>
        <ChevronLeft size={16} /> All shelves
      </Link>

      <div className={styles.header}>
        <div className={styles.titleRow}>
          {editing ? (
            <div className={styles.renameRow}>
              <input
                className={styles.renameInput}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveRename();
                  if (e.key === 'Escape') setEditing(false);
                }}
                autoFocus
                aria-label="Shelf name"
                maxLength={120}
              />
              <button className={styles.iconBtn} onClick={saveRename} aria-label="Save name" title="Save">
                <Check size={18} />
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => setEditing(false)}
                aria-label="Cancel rename"
                title="Cancel"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <>
              <h1 className={styles.title}>{data.name}</h1>
              <span
                className={styles.visibility}
                title={data.is_public ? 'Public shelf' : 'Private shelf'}
              >
                {data.is_public ? <Globe size={16} /> : <Lock size={16} />}
              </span>
            </>
          )}
        </div>

        <div className={styles.subRow}>
          <span className={styles.count}>
            {total} book{total !== 1 ? 's' : ''}
          </span>
          {canEdit && !editing && (
            <div className={styles.manage}>
              <button className={styles.manageBtn} onClick={startRename}>
                <Pencil size={14} /> Rename
              </button>
              <button className={styles.manageBtnDanger} onClick={onDelete} disabled={deleteShelf.isPending}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
        {actionError && <p className={styles.actionError}>{actionError}</p>}
      </div>

      {books.length === 0 && !isFetching ? (
        <EmptyState message="This shelf is empty. Add books from any book's page." />
      ) : (
        <>
          <div className={styles.grid}>
            {books.map((book, i) => (
              <BookCard
                key={book.id}
                book={book}
                style={{ animationDelay: `${Math.min(i, 24) * 35}ms` }}
                onRemove={canEdit ? onRemoveBook : undefined}
                removeLabel="Remove from shelf"
              />
            ))}
          </div>

          {hasMore && (
            <div className={styles.loadMore}>
              <Button variant="ghost" onClick={() => setPage((p) => p + 1)} disabled={isFetching}>
                {isFetching ? (
                  <>
                    <Spinner size={16} /> Loading…
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
