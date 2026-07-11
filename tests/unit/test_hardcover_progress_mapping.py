# -*- coding: utf-8 -*-
# SPDX-License-Identifier: GPL-3.0-or-later
"""Regression pins for the local percentage -> Hardcover edition-page write.

No network is used: the boundary client is covered with MockHardcoverClient in
test_kosync_pushes_to_hardcover; this module drives the real mapping method
with its GraphQL executor replaced by a recorder.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from cps.services.hardcover import HardcoverClient, STATUS_READ, STATUS_READING


def _client_with_user_book(user_book):
    """Build the service without its network-owning constructor."""
    client = HardcoverClient.__new__(HardcoverClient)
    client.get_user_book = MagicMock(return_value=user_book)
    client.add_book = MagicMock()
    client.change_book_status = MagicMock(return_value=user_book)
    client.execute = MagicMock(return_value={"update_user_book_read": {"id": 8}})
    return client


def _reading_user_book(*, status=STATUS_READING, pages=400, edition_id=77):
    return {
        "id": 12,
        "status_id": status,
        "edition": {"id": edition_id, "pages": pages},
        "user_book_reads": [{"id": 34, "started_at": "2026-01-02"}],
    }


@pytest.mark.unit
def test_progress_maps_percentage_to_selected_edition_pages():
    client = _client_with_user_book(_reading_user_book())

    client.update_reading_progress({"hardcover-id": "9", "hardcover-edition": "77"}, 37.5)

    client.get_user_book.assert_called_once_with({"hardcover-id": "9", "hardcover-edition": "77"})
    client.execute.assert_called_once()
    variables = client.execute.call_args.kwargs["variables"]
    assert variables["readId"] == 34
    assert variables["pages"] == 150  # round(400 pages * 37.5%)
    assert variables["editionId"] == 77
    assert variables["startedAt"] == "2026-01-02"
    assert variables["finishedAt"] is None


@pytest.mark.unit
def test_already_read_book_at_100_percent_is_a_noop():
    """Repeated completion reports must not duplicate a remote page write."""
    client = _client_with_user_book(_reading_user_book(status=STATUS_READ))

    client.update_reading_progress({"hardcover-id": "9"}, 100)

    client.change_book_status.assert_not_called()
    client.execute.assert_not_called()
