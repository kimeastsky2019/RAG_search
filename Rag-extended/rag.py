import time
from typing import Any
from xai_sdk import AsyncClient
from xai_sdk.chat import system, user
from xai_sdk.tools import collections_search

from config import XAI_MODEL, TOP_K, SYSTEM_GUARDRAIL
from citations import normalize_citations, citations_to_bullets
from filters import build_search_filters

def _first_text(*vals: Any) -> str | None:
    for v in vals:
        if isinstance(v, str) and v:
            return v
    return None

def _extract_text_from_output(output: Any) -> str | None:
    if hasattr(output, "delta") and output.delta:
        delta = output.delta
        return _first_text(
            getattr(delta, "content", None),
            getattr(delta, "text", None),
            getattr(delta, "output_text", None),
        )
    if hasattr(output, "message") and output.message:
        msg = output.message
        return _first_text(
            getattr(msg, "content", None),
            getattr(msg, "text", None),
        )
    return _first_text(
        getattr(output, "content", None),
        getattr(output, "text", None),
        getattr(output, "output_text", None),
    )

def build_filter_instructions(filters: dict | None) -> str:
    if not filters:
        return ""
    parts = []
    for k, v in filters.items():
        parts.append(f"{k}={v}")
    return "다음 필터 조건을 만족하는 문서 컨텍스트만 우선 사용하라: " + ", ".join(parts)

async def run_rag(
    client: AsyncClient,
    collection_id: str,
    query: str,
    filters: dict | None = None,
) -> dict:
    t0 = time.time()

    # System instruction with optional filters
    sys_content = SYSTEM_GUARDRAIL
    filter_inst = build_filter_instructions(filters)
    if filter_inst:
        sys_content = sys_content + "\n" + filter_inst
        
    messages = [
        system(sys_content),
        user(query)
    ]

    tool_kwargs = {
        "collection_ids": [collection_id],
        "retrieval_mode": "hybrid",
        "limit": TOP_K,
    }
    if filter_inst:
        tool_kwargs["instructions"] = filter_inst

    tool = collections_search(**tool_kwargs)

    chat_session = client.chat.create(
        model=XAI_MODEL,
        messages=messages,
        tools=[tool],
        temperature=0.1,
        max_tokens=800,
    )

    response = await chat_session.sample()
    answer = (response.content or "").strip()
    if not answer:
        answer = "제공된 문서 근거로는 확인할 수 없습니다."
    citations = [{"text": c} for c in getattr(response, "citations", [])]

    usage = getattr(response, "usage", None)
    usage_data = {
        "prompt_tokens": getattr(usage, "prompt_tokens", None),
        "completion_tokens": getattr(usage, "completion_tokens", None),
        "total_tokens": getattr(usage, "total_tokens", None),
    }
    
    latency_ms = int((time.time() - t0) * 1000)
    return {
        "answer": answer,
        "citations": citations,
        "latency_ms": latency_ms,
        "usage": usage_data,
    }
