# -*- coding: utf-8 -*-
# SPDX-License-Identifier: GPL-3.0-or-later
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.unit
def test_shared_browse_list_has_persisted_accessible_view_toggle():
    src = (ROOT / "frontend/src/pages/BrowseList.tsx").read_text()
    assert "usePersistentBool('cwng:browse-list-compact'" in src
    assert "aria-pressed={!compact}" in src
    assert "aria-pressed={compact}" in src
    assert "compact ? styles.list : styles.grid" in src
    assert 'role="list"' in src


@pytest.mark.unit
def test_compact_rows_keep_mobile_touch_target():
    css = (ROOT / "frontend/src/pages/BrowseList.module.css").read_text()
    assert ".list .item" in css
    assert "min-height: 40px" in css
