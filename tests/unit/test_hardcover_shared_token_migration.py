# Calibre-Web Automated – fork of Calibre-Web
# Copyright (C) 2024-2026 Calibre-Web-NextGen contributors
# SPDX-License-Identifier: GPL-3.0-or-later

"""Regression tests for household users sharing one Hardcover token."""

import pytest
from sqlalchemy import create_engine, text

from cps import ub

pytestmark = pytest.mark.unit


def _engine(tmp_path, *, unique):
    engine = create_engine(f"sqlite:///{tmp_path / ('unique.db' if unique else 'plain.db')}")
    unique_sql = " UNIQUE" if unique else ""
    with engine.begin() as conn:
        conn.execute(text(f"""
            CREATE TABLE user (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR NOT NULL UNIQUE,
                hardcover_token VARCHAR{unique_sql},
                preserved VARCHAR DEFAULT 'kept'
            )
        """))
        conn.execute(text(
            "CREATE INDEX ix_user_preserved ON user (preserved)"
        ))
        conn.execute(text(
            "INSERT INTO user (name, hardcover_token, preserved) "
            "VALUES ('existing', 'first-token', 'original')"
        ))
    return engine


def _insert_shared_token(engine):
    with engine.begin() as conn:
        conn.execute(text(
            "INSERT INTO user (name, hardcover_token) VALUES ('alice', 'household-token')"
        ))
        conn.execute(text(
            "INSERT INTO user (name, hardcover_token) VALUES ('bob', 'household-token')"
        ))


def _schema_snapshot(engine):
    with engine.connect() as conn:
        return conn.execute(text(
            "SELECT type, name, sql FROM sqlite_master "
            "WHERE tbl_name='user' ORDER BY type, name"
        )).fetchall()


def test_fresh_install_unique_constraint_is_removed_without_data_loss(tmp_path):
    engine = _engine(tmp_path, unique=True)

    ub.migrate_user_hardcover_token_constraint(engine)
    _insert_shared_token(engine)

    with engine.connect() as conn:
        assert conn.execute(text(
            "SELECT name, hardcover_token, preserved FROM user ORDER BY id"
        )).fetchall() == [
            ("existing", "first-token", "original"),
            ("alice", "household-token", "kept"),
            ("bob", "household-token", "kept"),
        ]
        assert conn.execute(text(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='ix_user_preserved'"
        )).scalar() == "ix_user_preserved"


def test_migrated_non_unique_schema_is_an_exact_noop(tmp_path):
    engine = _engine(tmp_path, unique=False)
    before = _schema_snapshot(engine)

    ub.migrate_user_hardcover_token_constraint(engine)

    assert _schema_snapshot(engine) == before
    _insert_shared_token(engine)


def test_migration_is_idempotent(tmp_path):
    engine = _engine(tmp_path, unique=True)

    ub.migrate_user_hardcover_token_constraint(engine)
    after_first = _schema_snapshot(engine)
    ub.migrate_user_hardcover_token_constraint(engine)

    assert _schema_snapshot(engine) == after_first
    _insert_shared_token(engine)


def test_model_does_not_declare_hardcover_token_unique():
    assert not ub.User.__table__.columns["hardcover_token"].unique


def test_cold_boot_create_all_allows_shared_token(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'cold-boot.db'}")
    ub.Base.metadata.create_all(engine)

    with engine.begin() as conn:
        conn.execute(text(
            "INSERT INTO user (name, email, hardcover_token) "
            "VALUES ('cold-a', 'cold-a@x', 'household-token')"
        ))
        conn.execute(text(
            "INSERT INTO user (name, email, hardcover_token) "
            "VALUES ('cold-b', 'cold-b@x', 'household-token')"
        ))

    with engine.connect() as conn:
        assert conn.execute(text(
            "SELECT name FROM user WHERE hardcover_token='household-token' ORDER BY name"
        )).scalars().all() == ["cold-a", "cold-b"]
