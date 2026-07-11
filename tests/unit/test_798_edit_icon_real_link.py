# -*- coding: utf-8 -*-
# SPDX-License-Identifier: GPL-3.0-or-later
"""Regression pin for fork issue #798: the hover edit pencil on a book card was
a ``<button onClick={() => navigate(...)}>`` rather than a real anchor, so
⌘/ctrl/middle-click (open-in-new-tab) didn't work — there was no ``href`` for
the browser to open.

The fix renders the pencil as a wouter ``<Link href="/book/:id/edit">``. A plain
click still does SPA navigation (wouter intercepts only unmodified left-clicks);
a modified click falls through to the browser, which opens the edit page in a
new tab natively. BookDetail.tsx and Duplicates.tsx already used ``<Link>`` for
their edit affordance — this brings the book-card pencil in line.

This pin keeps the pencil an anchor: the ``href`` must be present, and the old
imperative ``navigate(`/book/.../edit`)`` pattern must stay gone (a button with
onClick cannot be opened in a new tab).
"""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BOOKCARD_TSX = REPO_ROOT / "frontend" / "src" / "components" / "BookCard.tsx"


def test_quick_edit_pencil_is_a_real_link():
    src = BOOKCARD_TSX.read_text(encoding="utf-8")
    # The edit pencil must navigate via a real <Link href> so modified-clicks
    # open a new tab (native anchor behaviour), not a button + imperative nav.
    assert "href={`/book/${book.id}/edit`}" in src, (
        "BookCard's quick-edit pencil must be a <Link href> to /book/:id/edit "
        "so cmd/ctrl/middle-click opens the editor in a new tab (#798)."
    )
    assert "navigate(`/book/${book.id}/edit`)" not in src, (
        "BookCard's quick-edit pencil must not use imperative navigate() — a "
        "<button onClick> cannot be opened in a new tab (#798)."
    )
