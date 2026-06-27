import { useState } from 'react';
import { Shield, Trash2, Mail, UserPlus } from 'lucide-react';
import {
  useAdminUsers, useUpdateAdminUser, useDeleteAdminUser, useCreateAdminUser, useMe,
} from '../lib/queries';
import { SpinnerCentered } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import type { AdminUser } from '../lib/api';
import { ApiError } from '../lib/api';
import styles from './Admin.module.css';

// Order + labels for the role toggles shown per user.
const ROLE_FIELDS: { key: string; label: string }[] = [
  { key: 'admin', label: 'Admin' },
  { key: 'upload', label: 'Upload' },
  { key: 'edit', label: 'Edit metadata' },
  { key: 'download', label: 'Download' },
  { key: 'delete_books', label: 'Delete books' },
  { key: 'edit_shelfs', label: 'Edit public shelves' },
  { key: 'passwd', label: 'Change password' },
  { key: 'viewer', label: 'Viewer' },
];

export function Admin() {
  const { data, isLoading, error } = useAdminUsers();
  const updateUser = useUpdateAdminUser();
  const deleteUser = useDeleteAdminUser();
  const createUser = useCreateAdminUser();
  const me = useMe().data;
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', password: '', email: '', upload: false });

  if (isLoading) return <SpinnerCentered size={40} />;
  if (error || !data) {
    return (
      <main className={styles.container}>
        <EmptyState message={error instanceof Error ? error.message : 'Could not load users.'} />
      </main>
    );
  }

  const toggleRole = (user: AdminUser, key: string, value: boolean) => {
    setBanner(null);
    updateUser.mutate(
      { id: user.id, roles: { [key]: value } },
      {
        onError: (err) =>
          setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Update failed.' }),
      },
    );
  };

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    createUser.mutate(
      {
        name: form.name.trim(),
        password: form.password,
        email: form.email.trim() || undefined,
        roles: { download: true, viewer: true, upload: form.upload },
      },
      {
        onSuccess: (u) => {
          setBanner({ ok: true, text: `Created ${u.name}.` });
          setForm({ name: '', password: '', email: '', upload: false });
          setShowNew(false);
        },
        onError: (err) =>
          setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Create failed.' }),
      },
    );
  };

  const onDelete = (user: AdminUser) => {
    if (!window.confirm(`Delete user "${user.name}"? Their shelves and reading data are removed too.`)) return;
    setBanner(null);
    deleteUser.mutate(user.id, {
      onSuccess: () => setBanner({ ok: true, text: `Deleted ${user.name}.` }),
      onError: (err) =>
        setBanner({ ok: false, text: err instanceof ApiError ? err.message : 'Delete failed.' }),
    });
  };

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <Shield size={22} className={styles.headerIcon} />
        <h1 className={styles.title}>User administration</h1>
        <span className={styles.count}>{data.items.length}</span>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => { setShowNew((v) => !v); setBanner(null); }}
        >
          <UserPlus size={16} /> New user
        </button>
      </div>

      {banner && <p className={banner.ok ? styles.msgOk : styles.msgErr}>{banner.text}</p>}

      {showNew && (
        <form className={styles.newForm} onSubmit={onCreate}>
          <div className={styles.newRow}>
            <label className={styles.field}>
              <span>Username</span>
              <input
                value={form.name} required autoFocus
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span>Password</span>
              <input
                type="password" value={form.password} required
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span>Email (optional)</span>
              <input
                type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
          </div>
          <div className={styles.newActions}>
            <label className={styles.roleToggle}>
              <input
                type="checkbox" checked={form.upload}
                onChange={(e) => setForm({ ...form, upload: e.target.checked })}
              />
              Can upload books
            </label>
            <button type="submit" className={styles.submitBtn} disabled={createUser.isPending}>
              {createUser.isPending ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      )}

      <div className={styles.users}>
        {data.items.map((user) => {
          const isSelf = me?.id === user.id;
          return (
            <section key={user.id} className={styles.card}>
              <div className={styles.cardHead}>
                <div>
                  <p className={styles.name}>
                    {user.name}
                    {isSelf && <span className={styles.youBadge}>you</span>}
                  </p>
                  {user.email && (
                    <p className={styles.email}><Mail size={12} /> {user.email}</p>
                  )}
                </div>
                {!isSelf && !user.is_guest && (
                  <button className={styles.deleteBtn} onClick={() => onDelete(user)}
                    disabled={deleteUser.isPending} aria-label={`Delete ${user.name}`}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className={styles.roles}>
                {ROLE_FIELDS.map(({ key, label }) => (
                  <label key={key} className={styles.roleToggle}>
                    <input
                      type="checkbox"
                      checked={!!user.roles[key]}
                      disabled={updateUser.isPending}
                      onChange={(e) => toggleRole(user, key, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
