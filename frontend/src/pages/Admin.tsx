import { useState } from 'react';
import { Shield, Trash2, Mail } from 'lucide-react';
import { useAdminUsers, useUpdateAdminUser, useDeleteAdminUser, useMe } from '../lib/queries';
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
  const me = useMe().data;
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

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
      </div>

      {banner && <p className={banner.ok ? styles.msgOk : styles.msgErr}>{banner.text}</p>}

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
