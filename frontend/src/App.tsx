import { Router, Route, Switch } from 'wouter';
import { useMe, useLogout } from './lib/queries';
import { Login } from './pages/Login';
import { Catalog } from './pages/Catalog';
import { BookDetail } from './pages/BookDetail';
import { BrowseList } from './pages/BrowseList';
import { AppShell } from './components/AppShell';
import { SpinnerCentered } from './components/Spinner';

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
      <AppShell userName={me.name} onLogout={() => logout.mutate()}>
        <Switch>
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

          <Route path="/">{() => <Catalog />}</Route>
        </Switch>
      </AppShell>
    </Router>
  );
}
