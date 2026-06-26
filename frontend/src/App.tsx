import { lazy, Suspense } from 'react';
import { Router, Route, Switch } from 'wouter';
import { useMe, useLogout } from './lib/queries';
import { Login } from './pages/Login';
import { Catalog } from './pages/Catalog';
import { BookDetail } from './pages/BookDetail';
import { BrowseList } from './pages/BrowseList';
import { Shelves } from './pages/Shelves';
import { Shelf } from './pages/Shelf';
import { AdvancedSearch } from './pages/AdvancedSearch';
import { Account } from './pages/Account';
import { EditBook } from './pages/EditBook';
import { Upload } from './pages/Upload';
import { Admin } from './pages/Admin';
import { AppShell } from './components/AppShell';
import { SpinnerCentered } from './components/Spinner';

// The reader pulls in epub.js (large) — load it only when a book is opened so it
// stays out of the initial bundle.
const Reader = lazy(() => import('./pages/Reader').then((m) => ({ default: m.Reader })));

export function App() {
  const { data: me, isLoading } = useMe();
  const logout = useLogout();

  if (isLoading) {
    return <SpinnerCentered size={40} />;
  }

  if (!me) {
    return <Login />;
  }

  return (
    <Router base="/app">
      <Switch>
        {/* Full-screen reader — outside the app shell (no sidebar/topbar). */}
        <Route path="/read/:id">
          {(p) => (
            <Suspense fallback={<SpinnerCentered size={40} />}>
              <Reader id={p.id} />
            </Suspense>
          )}
        </Route>

        {/* Everything else lives inside the shell. */}
        <Route>
          <AppShell userName={me.name} onLogout={() => logout.mutate()}>
            <Switch>
          <Route path="/book/:id/edit">{(p) => <EditBook id={p.id} />}</Route>
          <Route path="/book/:id" component={BookDetail} />

          {/* Browse: entity lists + per-entity filtered catalog */}
          <Route path="/authors">{() => <BrowseList plural="authors" title="Authors" />}</Route>
          <Route path="/authors/:id">
            {(p) => <Catalog entityKind="author" entityId={decodeURIComponent(p.id)} />}
          </Route>

          <Route path="/series">{() => <BrowseList plural="series" title="Series" />}</Route>
          <Route path="/series/:id">
            {(p) => <Catalog entityKind="series" entityId={decodeURIComponent(p.id)} />}
          </Route>

          <Route path="/tags">{() => <BrowseList plural="tags" title="Tags" />}</Route>
          <Route path="/tags/:id">
            {(p) => <Catalog entityKind="tag" entityId={decodeURIComponent(p.id)} />}
          </Route>

          <Route path="/publishers">{() => <BrowseList plural="publishers" title="Publishers" />}</Route>
          <Route path="/publishers/:id">
            {(p) => <Catalog entityKind="publisher" entityId={decodeURIComponent(p.id)} />}
          </Route>

          <Route path="/languages">{() => <BrowseList plural="languages" title="Languages" />}</Route>
          <Route path="/languages/:id">
            {(p) => <Catalog entityKind="language" entityId={decodeURIComponent(p.id)} />}
          </Route>

          {/* Shelves */}
          <Route path="/shelves">{() => <Shelves />}</Route>
          <Route path="/shelf/:id">{(p) => <Shelf id={p.id} />}</Route>

          {/* Advanced search */}
          <Route path="/search">{() => <AdvancedSearch />}</Route>

          {/* Account / settings */}
          <Route path="/account">{() => <Account />}</Route>

          {/* Upload */}
          <Route path="/upload">{() => <Upload />}</Route>

          {/* Admin */}
          <Route path="/admin">{() => <Admin />}</Route>

          <Route path="/">{() => <Catalog />}</Route>
            </Switch>
          </AppShell>
        </Route>
      </Switch>
    </Router>
  );
}
