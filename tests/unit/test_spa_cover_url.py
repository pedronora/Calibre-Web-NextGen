from types import SimpleNamespace

from cps.api.serializers import serialize_book_detail, serialize_book_list_item


def _book(has_cover):
    return SimpleNamespace(
        id=42,
        title="Cover test",
        series_index=None,
        has_cover=has_cover,
        authors=[],
        series=[],
        data=[],
        tags=[],
        ratings=[],
        comments=[],
        languages=[],
        publishers=[],
        identifiers=[],
        pubdate=None,
    )


def test_coverless_book_serializers_return_none():
    book = _book(has_cover=0)

    assert serialize_book_list_item(book)["cover_url"] is None
    assert serialize_book_detail(book)["cover_url"] is None


def test_book_with_cover_serializers_return_cover_paths():
    book = _book(has_cover=1)

    assert serialize_book_list_item(book)["cover_url"] == "/cover/42/sm"
    assert serialize_book_detail(book)["cover_url"] == "/cover/42/og"
