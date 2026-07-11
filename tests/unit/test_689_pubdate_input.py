# -*- coding: utf-8 -*-
# SPDX-License-Identifier: GPL-3.0-or-later
"""Behavioural test for the publication-date field in the redesigned editor
(fork #689 remainder): the new UI editor shipped with no pubdate field, so the
publication date could only be set in the classic editor.

The fix routes ``pubdate`` through ``edit_book_param`` — the canonical
single-field editor behind the SPA's ``/api/v1/books/<id>/metadata`` POST — so
it shares the same commit / ``mark_book_modified`` / change-log path as every
other field, and lists it in ``EDITABLE_FIELDS`` so the endpoint dispatches it.

These tests exercise the pubdate branch directly:
  * a valid date PERSISTS (book.pubdate is set, success response);
  * an invalid value is REJECTED — book.pubdate is left UNCHANGED (not clobbered
    to the default sentinel, which is what the classic editor does);
  * an empty value CLEARS (resets to Books.DEFAULT_PUBDATE).

Invalid input is surfaced as a per-field error (``success: False``) rather than
a top-level 4xx — the endpoint returns field-level errors at HTTP 200 so the SPA
can show them inline and a single bad field doesn't abort an otherwise-valid
multi-field save. See notes/delegate-fe-batch-REPORT.md for the rationale.
"""
import datetime
import inspect
import json
from types import SimpleNamespace
from unittest.mock import patch, MagicMock

import pytest

import cps.editbooks as editbooks

# edit_book_param is decorated with @login_required_if_no_ano + @edit_required
# (auth gating irrelevant to the pubdate branch). inspect.unwrap strips both
# (they use functools.wraps) so we exercise the real logic without a Flask
# request context — same approach test_api_v1_edit.py takes for update_metadata.
_edit_book_param = inspect.unwrap(editbooks.edit_book_param)


def _run_pubdate(value, prior=None):
    """Call edit_book_param('pubdate', ...) against a fake book; return (book, body).

    calibre_db / helper / log are mocked so the branch runs in isolation; db is
    left real so Books.DEFAULT_PUBDATE is the genuine sentinel.
    """
    book = SimpleNamespace(id=5, title="T", authors=[], pubdate=prior)
    calibre_db = MagicMock()
    calibre_db.get_book.return_value = book
    with patch.object(editbooks, "calibre_db", calibre_db), \
            patch.object(editbooks, "helper"), \
            patch.object(editbooks, "log"):
        ret = _edit_book_param("pubdate", {"pk": "5", "value": value})
    body = json.loads(ret.get_data(as_text=True))
    return book, body


@pytest.mark.unit
def test_pubdate_is_dispatched_by_the_spa_endpoint():
    # The endpoint only routes fields listed in EDITABLE_FIELDS; pubdate must be
    # present or the editor's pubdate payload is silently dropped (#689).
    from cps.api import edit as edit_api
    assert "pubdate" in edit_api.EDITABLE_FIELDS


@pytest.mark.unit
def test_pubdate_valid_persists():
    book, body = _run_pubdate("2020-05-15")
    assert book.pubdate == datetime.datetime(2020, 5, 15)
    assert body["success"] is True
    assert body["newValue"] == "2020-05-15"


@pytest.mark.unit
def test_pubdate_invalid_is_rejected_without_clobber():
    prior = datetime.datetime(2010, 1, 1)
    book, body = _run_pubdate("not-a-date", prior=prior)
    # Rejected, not clobbered: the existing pubdate is untouched.
    assert book.pubdate == prior
    assert body["success"] is False
    assert "publication date" in body["msg"].lower()


@pytest.mark.unit
def test_pubdate_empty_clears_to_default():
    book, body = _run_pubdate("")
    assert book.pubdate == editbooks.db.Books.DEFAULT_PUBDATE
    assert body["success"] is True
