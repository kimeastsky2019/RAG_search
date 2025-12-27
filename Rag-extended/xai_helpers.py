from typing import Any


def extract_document_id(upload_resp: Any) -> str | None:
    if hasattr(upload_resp, "document_id") and upload_resp.document_id:
        return str(upload_resp.document_id)
    if hasattr(upload_resp, "file_metadata") and upload_resp.file_metadata:
        file_id = getattr(upload_resp.file_metadata, "file_id", None)
        if file_id:
            return str(file_id)
    if hasattr(upload_resp, "file_id") and upload_resp.file_id:
        return str(upload_resp.file_id)
    return None


async def delete_collection_document(client: Any, collection_id: str, doc_id: str) -> None:
    if hasattr(client.collections, "delete_document"):
        await client.collections.delete_document(collection_id=collection_id, document_id=doc_id)
        return
    if hasattr(client.collections, "remove_document"):
        await client.collections.remove_document(collection_id=collection_id, document_id=doc_id)
        return
    if hasattr(client.files, "delete"):
        await client.files.delete(file_id=doc_id)
        return
    raise RuntimeError("No supported delete method found for xAI client.")
