import os
import httpx
from typing import List, Dict, Any, Optional
from .filters import build_metadata
from .app import mgmt_client, chat_client, XAI_MODEL
from .database import get_session
from sqlmodel import select
from .models import Document, Collection

class RetrievalResult:
    def __init__(self, docs: List[Dict[str, Any]], metadata: Optional[Dict]=None):
        self.docs = docs          # [{content, source, ...}]
        self.metadata = metadata  # optional extra context

async def retrieve_from_xai(collection: Collection, query: str, filters: Optional[Dict]=None) -> RetrievalResult:
    """Search the xAI collection and return documents as RetrievalResult."""
    # Re‑use existing run_rag logic (without generating answer)
    from .app import run_rag
    result = await run_rag(
        client=chat_client,
        collection_id=collection.xai_id,
        query=query,
        filters=filters,
    )
    docs = result.get("documents", [])
    return RetrievalResult(docs=docs)

# ---------- External source examples ----------
async def retrieve_from_db(session, sql: str) -> RetrievalResult:
    rows = await session.exec(select(*).from_statement(sql)).all()
    docs = [{"content": str(r), "source": "db"} for r in rows]
    return RetrievalResult(docs=docs)

async def retrieve_from_rest(endpoint: str, params: dict) -> RetrievalResult:
    async with httpx.AsyncClient() as client:
        resp = await client.get(endpoint, params=params, timeout=5.0)
        resp.raise_for_status()
        data = resp.json()
    docs = [{"content": d.get("text", ""), "source": endpoint} for d in data.get("items", [])]
    return RetrievalResult(docs=docs)
