# -*- coding: utf-8 -*-
# SPDX-License-Identifier: GPL-3.0-or-later
"""Single source of truth for the per-user SPA theme set.

The stored value lives in the legacy ``User.theme`` integer column (historically
0 = "standard"/light, 1 = "caliBlur"/dark; every existing user was force-migrated
to 1 = dark for the v5.0.0 front-end work). We repurpose that column as the
canonical per-user theme code — safe because the classic UI never renders from
the stored value: ``cps/admin.py`` force-sets ``g.current_theme = 1`` on every
request, so classic stays dark-only while it is retired. Only the SPA reads the
stored value, via the slug this module maps it to.

The **slug** is what the SPA consumes (on ``/api/v1/auth/me`` and
``/api/v1/account``) and what CSS keys off (``<html data-theme="<slug>">``).
``frontend/src/lib/themes.ts`` mirrors this slug set; the pin test
``tests/unit/test_theme_registry.py`` fails if the two ever drift.
"""

# stored int code -> SPA slug. Order here is not significant; the SPA owns
# presentation order (themes.ts). Legacy code 0 (deprecated "standard") is no
# longer written and resolves to the dark default on read.
THEME_CODES = {
    1: "dark",
    2: "light",
    3: "sepia",
    4: "high-contrast",
    5: "midnight",
    6: "system",
}

DEFAULT_THEME_CODE = 1        # dark — current behaviour; existing users stay here
DEFAULT_THEME_SLUG = "dark"

_SLUG_TO_CODE = {slug: code for code, slug in THEME_CODES.items()}

# The set the account endpoint validates an incoming choice against.
ALLOWED_THEME_SLUGS = frozenset(THEME_CODES.values())


def theme_slug(code):
    """Stored int code -> SPA slug. Legacy/unknown (incl. the deprecated 0)
    resolves to the dark default so an unmigrated row never faults the SPA."""
    try:
        return THEME_CODES.get(int(code), DEFAULT_THEME_SLUG)
    except (TypeError, ValueError):
        return DEFAULT_THEME_SLUG


def theme_code(slug):
    """SPA slug -> stored int code. Unknown slug -> DEFAULT_THEME_CODE (dark).
    Callers should validate against ALLOWED_THEME_SLUGS first and 400 on a bad
    value; this stays defensive so it can never write a NULL/garbage code."""
    return _SLUG_TO_CODE.get(slug, DEFAULT_THEME_CODE)
