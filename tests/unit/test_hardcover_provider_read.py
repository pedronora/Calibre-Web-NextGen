# -*- coding: utf-8 -*-
# SPDX-License-Identifier: GPL-3.0-or-later
"""Regression pins for the Hardcover metadata provider's read path."""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

pytestmark = pytest.mark.unit


class _Response:
    def __init__(self, data):
        self._data = data

    def raise_for_status(self):
        return None

    def json(self):
        return self._data


def _configure(monkeypatch, token="global-token", user_token=None):
    from cps.metadata_provider import hardcover as module

    monkeypatch.setattr(module, "current_user", SimpleNamespace(hardcover_token=user_token))
    monkeypatch.setattr(
        module,
        "config",
        SimpleNamespace(resolved_hardcover_token=lambda: token),
    )
    return module


def test_manual_search_parses_metadata_record_shape(monkeypatch):
    module = _configure(monkeypatch)
    response = {
        "data": {
            "search": {
                "results": json.dumps({
                    "hits": [{
                        "document": {
                            "id": 123,
                            "title": "Dune",
                            "author_names": ["Frank Herbert"],
                            "slug": "dune",
                            "image": {"url": "https://images.example/dune.jpg"},
                            "description": "A desert planet.",
                            "release_date": "1965-08-01",
                            "genres": ["Science Fiction"],
                            "featured_series": {
                                "position": 1,
                                "series": {"name": "Dune"},
                            },
                        }
                    }]
                })
            }
        }
    }
    calls = []

    def post(url, json=None, headers=None, timeout=None):
        calls.append((url, json, dict(headers), timeout))
        return _Response(response)

    monkeypatch.setattr(module.requests, "post", post)

    provider = module.Hardcover()
    provider.active = True
    results = provider.search("Dune", generic_cover="fallback.jpg")

    assert len(results) == 1
    record = results[0]
    assert record.title == "Dune"
    assert record.authors == ["Frank Herbert"]
    assert record.identifiers == {"hardcover-id": 123, "hardcover-slug": "dune"}
    assert record.cover == "https://images.example/dune.jpg"
    assert record.series == "Dune"
    assert record.series_index == 1
    assert calls == [(
        module.Hardcover.BASE_URL,
        {"query": module.Hardcover.SEARCH_QUERY, "variables": {"query": "Dune"}},
        {**module.Hardcover.HEADERS, "Authorization": "Bearer global-token"},
        15,
    )]


def test_per_user_token_is_used_before_global_token(monkeypatch):
    module = _configure(monkeypatch, token="global-token", user_token="user-token")
    authorizations = []

    def post(url, json=None, headers=None, timeout=None):
        authorizations.append(headers["Authorization"])
        return _Response({"data": {"search": {"results": {"hits": []}}}})

    monkeypatch.setattr(module.requests, "post", post)

    provider = module.Hardcover()
    provider.active = True
    assert provider.search("Dune") == []
    assert authorizations == ["Bearer user-token"]


def test_hardcover_id_query_uses_integer_and_parses_editions(monkeypatch):
    module = _configure(monkeypatch)
    response = {
        "data": {
            "books": [{
                "id": 123,
                "slug": "dune",
                "description": "A desert planet.",
                "cached_tags": [{"tag": "Science Fiction"}],
                "book_series": [{"position": 1, "series": {"name": "Dune"}}],
                "editions": [{
                    "id": 456,
                    "title": "Dune: Deluxe Edition",
                    "release_date": "2020-10-20",
                    "isbn_13": "9780593099322",
                    "reading_format_id": 4,
                    "image": {"url": "https://images.example/edition.jpg"},
                    "language": {"code3": "eng"},
                    "publisher": {"name": "Ace"},
                    "contributions": [{"author": {"name": "Frank Herbert"}}],
                }],
            }]
        }
    }
    payloads = []

    def post(url, json=None, headers=None, timeout=None):
        payloads.append(json)
        return _Response(response)

    monkeypatch.setattr(module.requests, "post", post)
    monkeypatch.setattr(module, "get_language_name", lambda locale, code: "English")

    provider = module.Hardcover()
    provider.active = True
    results = provider.search("hardcover-id:123", locale="en")

    assert payloads == [{
        "query": module.Hardcover.EDITION_QUERY,
        "variables": {"query": 123},
    }]
    assert len(results) == 1
    edition = results[0]
    assert edition.title == "Dune: Deluxe Edition"
    assert edition.authors == ["Frank Herbert"]
    assert edition.identifiers == {
        "hardcover-id": 123,
        "hardcover-slug": "dune",
        "hardcover-edition": 456,
        "isbn": "9780593099322",
    }
    assert edition.cover == "https://images.example/edition.jpg"
    assert edition.series == "Dune"
    assert edition.series_index == 1
    assert edition.publisher == "Ace"
    assert edition.publishedDate == "2020-10-20"
    assert edition.languages == ["English"]
    assert edition.tags == ["Science Fiction"]
    assert edition.format == "E-Book"

