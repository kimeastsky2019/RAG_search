from filters import build_metadata, build_search_filters


def test_build_metadata_compacts_empty_values():
    assert build_metadata() is None
    assert build_metadata(category="policy") == {"category": "policy"}
    assert build_metadata(tags=["a", " ", "b"]) == {"tags": ["a", "b"]}


def test_build_search_filters_basic():
    filters = {
        "category": "policy",
        "tags": ["hr", "benefits"],
        "version": "v1",
        "date_from": "2024-01-01",
        "date_to": "2024-12-31",
    }
    result = build_search_filters(filters)
    assert result["category"] == "policy"
    assert result["version"] == "v1"
    assert result["tags"] == {"$all": ["hr", "benefits"]}
    assert result["date"] == {"$gte": "2024-01-01", "$lte": "2024-12-31"}


def test_build_search_filters_pass_through():
    filters = {"custom": "value", "tags": "alpha"}
    result = build_search_filters(filters)
    assert result["custom"] == "value"
    assert result["tags"] == ["alpha"]
