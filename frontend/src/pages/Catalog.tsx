import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { Search, ChevronLeft } from 'lucide-react';
import { BookCard } from '../components/BookCard';
import { Button } from '../components/Button';
import { Spinner, SpinnerCentered } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { useBooks, useEntityList, ENTITY_PLURAL } from '../lib/queries';
import type { EntityKind, ReadFilter } from '../lib/queries';
import type { Book } from '../lib/api';
import styles from './Catalog.module.css';

const SORT_OPTIONS = [
  { label: 'Newest', value: 'new' },
  { label: 'Oldest', value: 'old' },
  { label: 'Title A–Z', value: 'abc' },
  { label: 'Title Z–A', value: 'zyx' },
  { label: 'Author A–Z', value: 'authaz' },
  { label: 'Author Z–A', value: 'authza' },
  { label: 'Newest published', value: 'pubnew' },
  { label: 'Oldest published', value: 'pubold' },
];

const READ_FILTERS: { label: string; value: ReadFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Read', value: 'read' },
];

const KIND_LABEL: Record<EntityKind, string> = {
  author: 'Author',
  series: 'Series',
  tag: 'Tag',
  publisher: 'Publisher',
  language: 'Language',
};

interface CatalogProps {
  /** When set, the catalog is scoped to books linked to this entity. */
  entityKind?: EntityKind;
  entityId?: string | number;
}

function dedupAppend(prev: Book[], next: Book[]): Book[] {
  const seen = new Set(prev.map((b) => b.id));
  const fresh = next.filter((b) => !seen.has(b.id));
  return fresh.length ? [...prev, ...fresh] : prev;
}

export function Catalog({ entityKind, entityId }: CatalogProps) {
  const filtered = !!entityKind;

  const [page, setPage] = useState(1);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('new');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');

  const accKeyRef = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve the entity's display name (for the heading) from its browse list —
  // cached when the user arrives from the browse page, a cheap fetch otherwise.
  const entityListQuery = useEntityList(filtered ? ENTITY_PLURAL[entityKind!] : '');
  const entityName = filtered
    ? entityListQuery.data?.items.find((e) => String(e.id) === String(entityId))?.name
    : undefined;

  // Debounce the search box (library view only).
  useEffect(() => {
    if (filtered) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, filtered]);

  const resetKey = [search, sort, readFilter, entityKind ?? '', entityId ?? ''].join('|');

  // Any filter change resets paging to the first page.
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const { data, isLoading, isFetching, isPlaceholderData, error } = useBooks({
    page,
    search,
    sort,
    readFilter,
    entityKind,
    entityId,
  });

  // Accumulate pages; replace the accumulator whenever the filter set changes.
  // Skip placeholder data: on a filter change react-query briefly returns the
  // PREVIOUS result (placeholderData) under the new resetKey — acting on it
  // would mark the key seen and push the real filtered data onto the append
  // path, leaving stale cards behind a corrected count.
  useEffect(() => {
    if (!data || isPlaceholderData) return;
    if (resetKey !== accKeyRef.current) {
      setAllBooks(data.items);
      accKeyRef.current = resetKey;
    } else {
      setAllBooks((prev) => dedupAppend(prev, data.items));
    }
  }, [data, isPlaceholderData, resetKey]);

  const total = data?.total ?? 0;
  const hasMore = allBooks.length < total;
  const isFirstLoad = isLoading && allBooks.length === 0;

  const heading = filtered ? (entityName ?? '…') : 'Your Library';
  const countLabel =
    total > 0
      ? search && !filtered
        ? `${total} result${total !== 1 ? 's' : ''} for "${search}"`
        : `${total} book${total !== 1 ? 's' : ''}`
      : '';

  return (
    <main className={styles.container}>
      {filtered && (
        <Link href={`/${ENTITY_PLURAL[entityKind!]}`} className={styles.back}>
          <ChevronLeft size={16} />
          All {ENTITY_PLURAL[entityKind!]}
        </Link>
      )}

      <div className={styles.header}>
        {filtered && <span className={styles.kindLabel}>{KIND_LABEL[entityKind!]}</span>}
        <h1 className={styles.title}>{heading}</h1>
        {countLabel && <span className={styles.count}>{countLabel}</span>}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        {!filtered && (
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search title, author…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search books"
            />
          </div>
        )}

        {/* Read-status segmented control (disabled while a text search is active,
            which the API resolves on a separate code path). */}
        <div className={styles.segmented} role="group" aria-label="Read status filter">
          {READ_FILTERS.map((rf) => (
            <button
              key={rf.value}
              type="button"
              className={readFilter === rf.value ? styles.segActive : styles.seg}
              aria-pressed={readFilter === rf.value}
              disabled={!!search && !filtered}
              onClick={() => setReadFilter(rf.value)}
            >
              {rf.label}
            </button>
          ))}
        </div>

        <select
          className={styles.sortSelect}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort order"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isFirstLoad ? (
        <SpinnerCentered size={36} />
      ) : error ? (
        <EmptyState message={error instanceof Error ? error.message : 'Failed to load books.'} />
      ) : allBooks.length === 0 && !isFetching ? (
        <EmptyState
          message={
            search && !filtered
              ? `No results for "${search}".`
              : readFilter !== 'all'
                ? `No ${readFilter} books here.`
                : 'No books here.'
          }
        />
      ) : (
        <>
          <div className={styles.grid}>
            {allBooks.map((book, i) => (
              <BookCard
                key={book.id}
                book={book}
                style={{ animationDelay: `${Math.min(i, 24) * 35}ms` }}
              />
            ))}
          </div>

          {hasMore && (
            <div className={styles.loadMore}>
              <Button variant="ghost" onClick={() => setPage((p) => p + 1)} disabled={isFetching}>
                {isFetching ? (
                  <>
                    <Spinner size={16} />
                    Loading…
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
