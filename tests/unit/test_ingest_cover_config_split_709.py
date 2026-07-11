"""Regression test for fork #709.

During ingest auto-metadata-fetch, the cover-apply path calls
``config.get_book_path()`` (cps/helper.py save_cover), which reads
``config_calibre_split`` / ``config_calibre_split_dir``. The ingest process
must populate config through the same full load path as the app. Before #709,
its standalone loader omitted the split-library columns, so get_book_path() raised
``'ConfigSQL' object has no attribute 'config_calibre_split'`` and the cover was
never written (reporter @maraken).

These tests pin that the full loader populates the split-library settings so
get_book_path() works for both plain and split libraries.
"""
import os
import importlib
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit


def _make_app_db(path, *, split=0, split_dir=None, calibre_dir="/calibre-library"):
    from cps import config_sql, ub

    ub.init_db(str(path))
    encryption_key, _ = config_sql.get_encryption_key(str(path.parent))
    config_sql.load_configuration(ub.session, encryption_key)
    settings = ub.session.query(config_sql._Settings).one()
    settings.config_calibre_dir = calibre_dir
    settings.config_calibre_split = bool(split)
    settings.config_calibre_split_dir = split_dir
    ub.session.commit()


@pytest.fixture()
def ingest_processor(monkeypatch):
    scripts_dir = Path(__file__).resolve().parents[2] / "scripts"
    monkeypatch.syspath_prepend(str(scripts_dir))
    return importlib.import_module("ingest_processor")


def _fresh_config():
    from cps import config
    return config


def test_plain_library_loads_split_flag_false(ingest_processor, monkeypatch, tmp_path):
    app_db = tmp_path / "app.db"
    _make_app_db(app_db, split=0, calibre_dir="/calibre-library")
    monkeypatch.setenv("CWA_APP_DB_PATH", str(app_db))

    cfg = _fresh_config()
    monkeypatch.setattr(ingest_processor, "_cps_config", cfg)
    ingest_processor._load_cps_configuration_from_app_db()

    # The attribute must exist (absence is the #709 bug), and be False for a
    # plain library — get_book_path() must then return the calibre dir, not raise.
    assert cfg.config_calibre_split is False
    assert cfg.get_book_path() == "/calibre-library"


def test_split_library_routes_book_path_to_split_dir(ingest_processor, monkeypatch, tmp_path):
    app_db = tmp_path / "app.db"
    _make_app_db(app_db, split=1, split_dir="/books", calibre_dir="/calibre-library")
    monkeypatch.setenv("CWA_APP_DB_PATH", str(app_db))

    cfg = _fresh_config()
    monkeypatch.setattr(ingest_processor, "_cps_config", cfg)
    ingest_processor._load_cps_configuration_from_app_db()

    assert cfg.config_calibre_split is True
    assert cfg.config_calibre_split_dir == "/books"
    assert cfg.get_book_path() == "/books"
