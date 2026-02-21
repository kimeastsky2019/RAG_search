from .retriever import retrieve_from_xai, retrieve_from_db, retrieve_from_rest
from .generator import generate_answer

async def rag_pipeline(
    collection,  # Collection model instance
    query: str,
    filters: dict | None = None,
    external_sources: list[dict] | None = None,
) -> dict:
    """Run the Retriever → Generator pipeline.
    Returns a dict compatible with ChatResponse (answer, citations)."""
    # 1️⃣ Retrieve from xAI collection
    xai_res = await retrieve_from_xai(collection, query, filters)
    docs = xai_res.docs

    # 2️⃣ Retrieve from optional external sources
    if external_sources:
        for src in external_sources:
            if src["type"] == "db":
                db_res = await retrieve_from_db(src["session"], src["sql"])
                docs.extend(db_res.docs)
            elif src["type"] == "rest":
                rest_res = await retrieve_from_rest(src["endpoint"], src.get("params", {}))
                docs.extend(rest_res.docs)

    # 3️⃣ Generate answer using LLM
    result = await generate_answer(
        query=query,
        retrieved_docs=docs,
        collection_xai_id=collection.xai_id,
        system_prompt="You are a helpful assistant for the GnG Ontology platform. Provide concise, factual answers based on the supplied context.",
    )
    return result
