"""Regression tests for case-sensitive legacy bookmark databases (#805)."""
import inspect

import pytest
from sqlalchemy import create_engine, text


def _engine_with_bookmarks(rows):
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        # Deliberately no NOCASE collation: this is the upgraded legacy shape.
        conn.execute(text(
            "CREATE TABLE bookmark (id INTEGER PRIMARY KEY, user_id INTEGER, "
            "book_id INTEGER, format VARCHAR, bookmark_key VARCHAR)"
        ))
        for row in rows:
            conn.execute(text(
                "INSERT INTO bookmark (id, user_id, book_id, format, bookmark_key) "
                "VALUES (:id, :user_id, :book_id, :format, :bookmark_key)"
            ), row)
    return engine


def _engine_with_bookmarks_nocase(rows):
    """Fresh-schema shape: the ``format`` column carries ``COLLATE NOCASE``
    (what current code creates). A case-insensitive column makes
    ``format <> lower(format)`` always false, so the lowercasing UPDATE must
    force a binary comparison or it silently no-ops here (#805 live-repro)."""
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(text(
            "CREATE TABLE bookmark (id INTEGER PRIMARY KEY, user_id INTEGER, "
            "book_id INTEGER, format VARCHAR COLLATE NOCASE, bookmark_key VARCHAR)"
        ))
        for row in rows:
            conn.execute(text(
                "INSERT INTO bookmark (id, user_id, book_id, format, bookmark_key) "
                "VALUES (:id, :user_id, :book_id, :format, :bookmark_key)"
            ), row)
    return engine


def _rows(engine):
    with engine.connect() as conn:
        return conn.execute(text(
            "SELECT id, user_id, book_id, format, bookmark_key FROM bookmark ORDER BY id"
        )).mappings().all()


@pytest.mark.unit
def test_migration_keeps_newest_case_only_duplicate():
    from cps import ub

    engine = _engine_with_bookmarks([
        {"id": 1, "user_id": 4, "book_id": 9, "format": "EPUB", "bookmark_key": "cfiOld"},
        {"id": 2, "user_id": 4, "book_id": 9, "format": "epub", "bookmark_key": "cfiNew"},
    ])
    ub.migrate_bookmark_format_lowercase(engine, None)

    rows = _rows(engine)
    assert len(rows) == 1
    assert rows[0]["id"] == 2
    assert rows[0]["format"] == "epub"
    assert rows[0]["bookmark_key"] == "cfiNew"


@pytest.mark.unit
def test_migration_is_idempotent():
    from cps import ub

    engine = _engine_with_bookmarks([
        {"id": 1, "user_id": 4, "book_id": 9, "format": "EPUB", "bookmark_key": "cfiOld"},
        {"id": 2, "user_id": 4, "book_id": 9, "format": "epub", "bookmark_key": "cfiNew"},
    ])
    ub.migrate_bookmark_format_lowercase(engine, None)
    first = [dict(row) for row in _rows(engine)]
    ub.migrate_bookmark_format_lowercase(engine, None)
    assert [dict(row) for row in _rows(engine)] == first


@pytest.mark.unit
def test_migration_keeps_each_users_bookmark():
    from cps import ub

    engine = _engine_with_bookmarks([
        {"id": 1, "user_id": 4, "book_id": 9, "format": "EPUB", "bookmark_key": "cfiUser4"},
        {"id": 2, "user_id": 5, "book_id": 9, "format": "EPUB", "bookmark_key": "cfiUser5"},
    ])
    ub.migrate_bookmark_format_lowercase(engine, None)

    rows = _rows(engine)
    assert [(row["user_id"], row["format"], row["bookmark_key"]) for row in rows] == [
        (4, "epub", "cfiUser4"), (5, "epub", "cfiUser5"),
    ]


@pytest.mark.unit
def test_migration_lowercases_on_nocase_column():
    """On a NOCASE column an uppercase row must still be normalized to
    lowercase — the live-repro bug where the UPDATE no-oped and left 'EPUB'."""
    from cps import ub

    engine = _engine_with_bookmarks_nocase([
        {"id": 1, "user_id": 2, "book_id": 3, "format": "EPUB", "bookmark_key": "cfiU2"},
    ])
    ub.migrate_bookmark_format_lowercase(engine, None)

    rows = _rows(engine)
    assert len(rows) == 1
    assert rows[0]["format"] == "epub", "uppercase format must be lowercased even on a NOCASE column"
    assert rows[0]["bookmark_key"] == "cfiU2"


@pytest.mark.unit
def test_migration_merges_and_lowercases_on_nocase_column():
    """NOCASE column with a case-only duplicate: merge to the newest id AND
    ensure the survivor is lowercase."""
    from cps import ub

    engine = _engine_with_bookmarks_nocase([
        {"id": 1, "user_id": 2, "book_id": 3, "format": "EPUB", "bookmark_key": "cfiOld"},
        {"id": 2, "user_id": 2, "book_id": 3, "format": "epub", "bookmark_key": "cfiNew"},
    ])
    ub.migrate_bookmark_format_lowercase(engine, None)

    rows = _rows(engine)
    assert len(rows) == 1
    assert rows[0]["format"] == "epub"
    assert rows[0]["bookmark_key"] == "cfiNew"


@pytest.mark.unit
def test_migration_is_registered_after_kobo_bookmark_migration():
    from cps import ub

    source = inspect.getsource(ub.migrate_Database)
    assert source.index("migrate_kobo_bookmark_created_at(engine, _session)") < source.index(
        "migrate_bookmark_format_lowercase(engine, _session)"
    )
