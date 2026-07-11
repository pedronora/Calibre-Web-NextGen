# -*- coding: utf-8 -*-
# SPDX-License-Identifier: GPL-3.0-or-later
"""Regression test for fork issue #715: the new-UI send-to-e-reader dialog
showed an EMPTY recipient input with only a "blank = your e-reader email" hint,
so users believed their saved e-reader address had been lost — even though the
data was present (the account query returns ``kindle_mail`` and the backend
falls back to it when the recipient is blank).

The fix prefills the recipient field with the user's saved ``kindle_mail``
(fetched via the existing ``useAccount`` query) and replaces the misleading
"blank = …" label with a plain "Recipient(s)" label plus a hint that the saved
address is shown. Typing another address still overrides it for that send, and
a cleared field still falls back to the saved address server-side.

These source-pins fail the moment the prefill wiring is reverted, so the
"address looks lost" regression cannot silently return.
"""
import pytest

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DETAIL_TSX = REPO_ROOT / "frontend" / "src" / "pages" / "BookDetail.tsx"
QUERIES_TS = REPO_ROOT / "frontend" / "src" / "lib" / "queries.ts"


@pytest.mark.unit
def test_send_panel_prefills_recipient_from_saved_address():
    src = DETAIL_TSX.read_text(encoding="utf-8")
    # The recipient field must be seeded from a saved-address prop, not a hard
    # empty string (which is the #715 regression — the field looked empty).
    assert "defaultEmail" in src, (
        "SendPanel must accept a defaultEmail prop so the recipient field is "
        "prefilled with the user's saved e-reader address (#715)."
    )
    assert "useState(defaultEmail)" in src, (
        "The recipient state must initialize from defaultEmail, not '' (#715)."
    )
    # The misleading "blank = your e-reader email" label is gone — the field is
    # no longer blank, so that hint reads as the address being lost. (Pin the
    # user-visible t() label, not the string anywhere in the file, so the
    # explanatory JSDoc above can still reference the old wording.)
    assert "t('Recipient(s) — blank = your e-reader email')" not in src, (
        "The old 'blank = your e-reader email' label contradicts a prefilled "
        "field and re-introduces the #715 confusion; use a plain 'Recipient(s)' label."
    )


@pytest.mark.unit
def test_book_detail_sources_kindle_mail_from_account_query():
    src = DETAIL_TSX.read_text(encoding="utf-8")
    assert "useAccount" in src, (
        "BookDetail must read the saved e-reader address via useAccount (#715) "
        "rather than adding a new endpoint — the account query already exposes kindle_mail."
    )
    assert "kindle_mail" in src, (
        "BookDetail must pass the account's kindle_mail as the send dialog's defaultEmail (#715)."
    )


@pytest.mark.unit
def test_use_account_supports_deferred_fetch():
    src = QUERIES_TS.read_text(encoding="utf-8")
    assert "enabled" in src and "options" in src, (
        "useAccount must accept an {enabled} option so BookDetail can defer the "
        "fetch until the send-to-e-reader button is actually reachable (#715)."
    )
