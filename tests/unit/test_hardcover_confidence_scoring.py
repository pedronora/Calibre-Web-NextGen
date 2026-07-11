# -*- coding: utf-8 -*-
# SPDX-License-Identifier: GPL-3.0-or-later
"""Regression pins for Hardcover confidence weights and auto-apply threshold."""

from __future__ import annotations

import inspect

import pytest

from cps.metadata_provider.hardcover import Hardcover
from cps.services.Metadata import MetaRecord, MetaSourceInfo
from cps.tasks.auto_hardcover_id import TaskAutoHardcoverID

pytestmark = pytest.mark.unit


def _record(**overrides):
    values = {
        "id": "123",
        "title": "Dune",
        "authors": ["Frank Herbert"],
        "url": "https://hardcover.app/books/dune",
        "source": MetaSourceInfo("hardcover", "Hardcover", "https://hardcover.app/"),
        "series": "Dune",
    }
    values.update(overrides)
    record = MetaRecord(**values)
    record.series_index = overrides.get("series_index", 1)
    record.publisher = overrides.get("publisher", "Ace")
    record.publishedDate = overrides.get("publishedDate", "1965-08-01")
    record.identifiers = overrides.get("identifiers", {"isbn": "9780441172719"})
    return record


def test_exact_title_and_author_is_high_confidence():
    score, reason = Hardcover.calculate_confidence_score(
        _record(), "Dune", query_authors=["Frank Herbert"]
    )
    assert score == pytest.approx(0.95)
    assert reason.startswith("Excellent match:")


def test_wrong_title_without_other_signals_is_low_confidence():
    score, reason = Hardcover.calculate_confidence_score(
        _record(title="Pride and Prejudice", authors=[]), "Dune"
    )
    assert score < 0.5
    assert reason.startswith("Low confidence:")


def test_exact_isbn_short_circuits_to_full_confidence():
    score, reason = Hardcover.calculate_confidence_score(
        _record(), "Completely Wrong", query_isbn="978-0-441-17271-9"
    )
    assert score == 1.0
    assert reason == "ISBN exact match"


def test_series_publisher_and_year_contributions_are_pinned():
    base, _ = Hardcover.calculate_confidence_score(_record(), "Dune")
    enriched, reason = Hardcover.calculate_confidence_score(
        _record(),
        "Dune",
        query_series="Dune",
        query_series_index=1,
        query_publisher="Ace",
        query_year="1965",
    )
    assert base == pytest.approx(0.5)
    assert enriched == pytest.approx(0.8)
    assert enriched - base == pytest.approx(0.30)
    assert "series match" in reason
    assert "series position 1.0 matches" in reason
    assert "publisher match" in reason
    assert "year match" in reason


def test_nearby_year_gets_half_the_exact_year_contribution():
    exact, _ = Hardcover.calculate_confidence_score(_record(), "Dune", query_year="1965")
    adjacent, _ = Hardcover.calculate_confidence_score(_record(), "Dune", query_year="1966")
    base, _ = Hardcover.calculate_confidence_score(_record(), "Dune")
    assert exact - base == pytest.approx(0.05)
    assert adjacent - base == pytest.approx(0.025)


def test_default_auto_apply_threshold_is_085():
    default = inspect.signature(TaskAutoHardcoverID.__init__).parameters["min_confidence"].default
    assert default == 0.85
