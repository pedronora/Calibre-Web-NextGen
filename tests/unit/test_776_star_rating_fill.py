# Calibre-Web Automated – fork of Calibre-Web
# Copyright (C) 2024-2026 Calibre-Web-NextGen contributors
# SPDX-License-Identifier: GPL-3.0-or-later
# See CONTRIBUTORS for full list of authors.

"""Regression tests for fork issue #776: half-star ratings rendered as a
tiny star floating inside the outline instead of a half-filled star.

``StarRating`` encodes a fractional fill by wrapping a full-size filled
star in an ``overflow: hidden`` span whose *width* is the fill percentage.
The global reset (``frontend/src/styles/global.css``) applies
``svg { max-width: 100%; }``, so the "full-size" star inside a 50%-wide
wrapper was *scaled down to 50%* (SVGs shrink to their container under a
max-width cap, preserving aspect ratio) rather than cropped — every odd
Calibre rating (1, 3, 5, 7, 9 → x.5 stars) drew a shrunken star.

The fix opts the fill glyph out of the reset (``max-width: none`` on the
module's ``.fill`` class, which out-specifies the type selector) and makes
the component defensive against non-finite/unset ratings so a ``NaN`` can
never reach the width math or the aria label.

Both pins fail on pre-fix code and pass on the branch.
"""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
COMPONENT = REPO_ROOT / "frontend" / "src" / "components" / "StarRating.tsx"
MODULE_CSS = REPO_ROOT / "frontend" / "src" / "components" / "StarRating.module.css"
GLOBAL_CSS = REPO_ROOT / "frontend" / "src" / "styles" / "global.css"


def test_fill_glyph_opts_out_of_global_svg_max_width():
    """The fill star must not shrink to the clip wrapper's width (#776)."""
    css = MODULE_CSS.read_text(encoding="utf-8")
    fill_rule = css.split(".fill {", 1)[1].split("}", 1)[0]
    assert "max-width: none" in fill_rule, (
        "StarRating.module.css .fill must set 'max-width: none' — the global "
        "reset's 'svg { max-width: 100%; }' otherwise scales the fill star "
        "down to the fractional wrapper width instead of letting "
        "overflow:hidden crop it (issue #776)."
    )


def test_global_reset_still_caps_svgs():
    """Guards the premise: if the reset drops the svg cap, revisit the pin."""
    css = GLOBAL_CSS.read_text(encoding="utf-8")
    assert "svg { display: block; max-width: 100%; }" in css.replace(
        "img, picture, ", ""
    ) or "max-width: 100%" in css, (
        "global.css no longer caps svg max-width — the .fill override in "
        "StarRating.module.css may be removable, update test_776 accordingly."
    )


def test_component_guards_non_finite_ratings():
    """NaN/undefined must never reach the fill-width math or aria label."""
    src = COMPONENT.read_text(encoding="utf-8")
    assert "Number.isFinite(rating)" in src, (
        "StarRating must early-return for non-finite ratings so an unset "
        "rating can never produce 'width: NaN%' or a 'Rated NaN out of 5' "
        "label (issue #776)."
    )
    guard = src.index("Number.isFinite(rating)")
    math = src.index("rating / 2")
    assert guard < math, "The finite-rating guard must run before the fill math."
