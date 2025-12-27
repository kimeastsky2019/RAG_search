from typing import Any


def _normalize_tags(tags: Any) -> list[str] | None:
    if tags is None:
        return None
    if isinstance(tags, list):
        cleaned = [str(t).strip() for t in tags if str(t).strip()]
        return cleaned or None
    if isinstance(tags, str):
        cleaned = [t.strip() for t in tags.split(",") if t.strip()]
        return cleaned or None
    return None


def build_metadata(
    category: str | None = None,
    tags: list[str] | None = None,
    version: str | None = None,
    date: str | None = None,
) -> dict | None:
    metadata: dict[str, Any] = {}
    if category:
        metadata["category"] = category
    norm_tags = _normalize_tags(tags)
    if norm_tags:
        metadata["tags"] = norm_tags
    if version:
        metadata["version"] = version
    if date:
        metadata["date"] = date
    return metadata or None


def build_search_filters(filters: dict | None) -> dict | None:
    if not filters:
        return None

    out: dict[str, Any] = {}
    for key in ("category", "version"):
        val = filters.get(key)
        if val:
            out[key] = val

    tags = _normalize_tags(filters.get("tags"))
    if tags:
        out["tags"] = {"$all": tags} if len(tags) > 1 else tags

    date_from = filters.get("date_from")
    date_to = filters.get("date_to")
    if date_from or date_to:
        range_filter: dict[str, str] = {}
        if date_from:
            range_filter["$gte"] = date_from
        if date_to:
            range_filter["$lte"] = date_to
        out["date"] = range_filter

    for key, val in filters.items():
        if key in out or key in ("tags", "date_from", "date_to"):
            continue
        if val is not None:
            out[key] = val

    return out or None
