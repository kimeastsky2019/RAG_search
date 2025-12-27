from typing import Any

def normalize_citations(raw: Any) -> list[dict]:
    """
    Normalize raw citations/tool output into a consistent list of dicts:
    [
      {"title": "...", "page": 12, "snippet": "...", "score": 0.78},
      ...
    ]

    NOTE: xai-sdk streaming chunk schema may vary by version.
    This function is intentionally defensive.
    """
    if not raw:
        return []

    out: list[dict] = []
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, dict):
                out.append({
                    "title": item.get("title") or item.get("document_name") or item.get("source") or "unknown",
                    "page": item.get("page") or item.get("page_number"),
                    "snippet": item.get("snippet") or item.get("text") or item.get("content"),
                    "score": item.get("score"),
                })
            else:
                out.append({"title": "unknown", "page": None, "snippet": str(item), "score": None})
        return out

    if isinstance(raw, dict):
        return [raw]

    return [{"title": "unknown", "page": None, "snippet": str(raw), "score": None}]


def citations_to_bullets(citations: list[dict], max_items: int = 5) -> str:
    if not citations:
        return ""
    lines = []
    for c in citations[:max_items]:
        title = c.get("title", "unknown")
        page = c.get("page")
        page_str = f"p.{page}" if page is not None else ""
        lines.append(f"- {title} {page_str}".strip())
    return "\n".join(lines)
