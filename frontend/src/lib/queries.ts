import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, ApiError } from './api';
import type { Me, BooksPage, BookDetail, EntityList } from './api';

/** Entity kinds the catalog can be filtered by. Singular here; the browse-list
 *  endpoints/routes use the plural (author -> authors). */
export type EntityKind = 'author' | 'series' | 'tag' | 'publisher' | 'language';
export type ReadFilter = 'all' | 'read' | 'unread';

/** Map a singular entity kind to its plural browse endpoint/route segment. */
export const ENTITY_PLURAL: Record<EntityKind, string> = {
  author: 'authors',
  series: 'series',
  tag: 'tags',
  publisher: 'publishers',
  language: 'languages',
};

export interface BooksQuery {
  page: number;
  search?: string;
  sort?: string;
  readFilter?: ReadFilter;
  entityKind?: EntityKind;
  entityId?: string | number;
}

export function useMe() {
  return useQuery<Me | null>({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await apiGet<Me>('/api/v1/auth/me');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: 60000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { username: string; password: string }) =>
      apiPost<Me>('/api/v1/auth/login', vars),
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], data);
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost('/api/v1/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(['me'], null);
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useBooks(q: BooksQuery) {
  const { page, search = '', sort = 'new', readFilter = 'all', entityKind, entityId } = q;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('per_page', '24');
  params.set('sort', sort);
  // The API's search path is separate from entity/read filtering, so search is
  // only sent in the unfiltered library view (the UI hides the search box when
  // an entity filter is active).
  if (search && !entityKind) params.set('search', search);
  if (readFilter !== 'all') params.set('filter', readFilter);
  if (entityKind && entityId !== undefined && entityId !== '') {
    params.set(entityKind, String(entityId));
  }
  return useQuery<BooksPage>({
    queryKey: ['books', page, search, sort, readFilter, entityKind ?? '', entityId ?? ''],
    queryFn: () => apiGet<BooksPage>(`/api/v1/books?${params.toString()}`),
    placeholderData: (prev) => prev,
  });
}

/** Fetch an entity-browse list (authors/series/tags/publishers/languages).
 *  `plural` is the endpoint segment (e.g. "authors"). */
export function useEntityList(plural: string) {
  return useQuery<EntityList>({
    queryKey: ['entities', plural],
    queryFn: () => apiGet<EntityList>(`/api/v1/${plural}`),
    staleTime: 60000,
  });
}

export function useBook(id: string | number) {
  return useQuery<BookDetail>({
    queryKey: ['book', String(id)],
    queryFn: () => apiGet<BookDetail>(`/api/v1/books/${id}`),
  });
}

export function useToggleRead(id: string | number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (read: boolean) =>
      apiPost<{ read: boolean }>(`/api/v1/books/${id}/read`, { read }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['book', String(id)] });
    },
  });
}
