"""Regression coverage for the ingest process's standalone CPS config load."""

import importlib
import inspect
from pathlib import Path

import pytest


pytestmark = pytest.mark.unit


@pytest.fixture()
def ingest_processor(monkeypatch):
    scripts_dir = Path(__file__).resolve().parents[2] / "scripts"
    monkeypatch.syspath_prepend(str(scripts_dir))
    return importlib.import_module("ingest_processor")


def test_ingest_loads_full_config_row(ingest_processor, monkeypatch, tmp_path):
    from cps import config, config_sql, ub

    app_db = tmp_path / "app.db"
    monkeypatch.setenv("CWA_APP_DB_PATH", str(app_db))

    ub.init_db(str(app_db))
    encryption_key, _ = config_sql.get_encryption_key(str(tmp_path))
    config_sql.load_configuration(ub.session, encryption_key)
    settings = ub.session.query(config_sql._Settings).one()
    settings.config_hardcover_token = "ingest-hardcover-token"
    settings.config_kobo_sync = True
    settings.config_use_google_drive = True
    settings.config_google_drive_folder = "gdrive-folder"
    settings.config_calibre_dir = "/calibre-library"
    settings.config_certfile = "/config/server.crt"
    settings.config_keyfile = "/config/server.key"
    settings.config_calibre_split = True
    settings.config_calibre_split_dir = "/books"
    ub.session.commit()

    monkeypatch.setattr(ingest_processor, "_cps_config", config)
    ingest_processor._load_cps_configuration_from_app_db()

    assert config.config_hardcover_token == "ingest-hardcover-token"
    assert config.resolved_hardcover_token() == "ingest-hardcover-token"
    assert config.config_kobo_sync is True
    assert config.config_use_google_drive is True
    assert config.config_google_drive_folder == "gdrive-folder"
    assert config.config_calibre_dir == "/calibre-library"
    assert config.config_certfile == "/config/server.crt"
    assert config.config_keyfile == "/config/server.key"
    assert config.config_calibre_split is True
    assert config.config_calibre_split_dir == "/books"


def test_ingest_config_loader_pins_real_full_load_path(ingest_processor):
    assert not hasattr(ingest_processor, "_load_cps_settings_from_app_db")

    source = inspect.getsource(
        ingest_processor._load_cps_configuration_from_app_db
    )
    assert "ub.init_db" in source
    assert "config_sql.load_configuration" in source
    assert "init_config" in source or ".load(" in source
