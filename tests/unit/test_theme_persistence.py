import inspect

from cps.ub import migrate_user_table


def test_user_table_migration_does_not_force_reset_saved_theme():
    # A behavioral sepia-row test cannot catch the old bug: the removed update
    # only matched theme == 0, so a theme_code("sepia") == 3 row passed before
    # and after the fix. Pin the migration source instead, which fails on the
    # buggy implementation and prevents the startup reset from returning.
    source = inspect.getsource(migrate_user_table)

    assert "User.theme == 0" not in source
    assert "[theme-migration] Migrated" not in source
