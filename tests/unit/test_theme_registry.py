import re
from pathlib import Path

from cps.ui_themes import (
    ALLOWED_THEME_SLUGS,
    DEFAULT_THEME_CODE,
    THEME_CODES,
    theme_code,
    theme_slug,
)


def test_backend_theme_registry_matches_frontend():
    frontend_source = (Path(__file__).parents[2] / "frontend/src/lib/themes.ts").read_text(
        encoding="utf-8"
    )
    frontend_slugs = set(re.findall(r"slug:\s*'([^']+)'", frontend_source))

    assert frontend_slugs == set(THEME_CODES.values()) == set(ALLOWED_THEME_SLUGS)


def test_theme_defaults_and_round_trips():
    assert theme_slug(DEFAULT_THEME_CODE) == "dark"
    for slug in ALLOWED_THEME_SLUGS:
        assert theme_slug(theme_code(slug)) == slug
