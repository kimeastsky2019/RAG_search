import os
import httpx
from typing import List, Dict, Any
from .retriever import RetrievalResult

async def generate_answer(query: str,
                          retrieved_docs: List[Dict[str, Any]],
                          collection_xai_id: str,
                          system_prompt: str = "You are a helpful assistant for the GnG Ontology platform.") -> Dict:
    """Compose a prompt with retrieved context and call the LLM.
    Returns a dict with keys: answer, citations.
    """
    # Limit to a few docs to stay within token budget
    context = "\n\n".join([doc["content"] for doc in retrieved_docs[:5]])
    prompt = f"{system_prompt}\n\nContext:\n{context}\n\nQuestion: {query}"

    from .app import chat_client, XAI_MODEL
    resp = await chat_client.chat(
        model=XAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        collection_id=collection_xai_id,
    )
    # Build citations list
    citations = [{"source": doc.get("source", "unknown"), "snippet": doc.get("content", "")[:200]} for doc in retrieved_docs]
    return {"answer": resp.answer, "citations": citations}
