import argparse
import asyncio
import os
from dataclasses import dataclass
from typing import Optional

from xai_sdk import AsyncClient
from sqlmodel import select

from database import init_db, get_session
from models import Collection, Document
from filters import build_metadata
from xai_helpers import extract_document_id
from xai_sdk.proto import collections_pb2

STATUS_PROCESSED = collections_pb2.DocumentStatus.DOCUMENT_STATUS_PROCESSED
STATUS_FAILED = collections_pb2.DocumentStatus.DOCUMENT_STATUS_FAILED


# We need to copy guess_content_type here or keep it.
# Ideally we import from a common util, but since I am editing keeping it here is fine.

POLL_INTERVAL_SEC = 2
MAX_CONCURRENCY = 4

SUPPORTED_EXT = {".pdf", ".txt", ".md", ".jpg", ".jpeg", ".png"}

@dataclass
class DocMeta:
    category: str | None = None
    tags: list[str] | None = None
    version: str | None = None
    date: str | None = None  # YYYY-MM-DD (optional)


def guess_content_type(path: str) -> str:
    ext = os.path.splitext(path.lower())[1]
    if ext == ".pdf":
        return "application/pdf"
    if ext in [".txt", ".md"]:
        return "text/plain"
    if ext in [".jpg", ".jpeg"]:
        return "image/jpeg"
    if ext == ".png":
        return "image/png"
    return "application/octet-stream"


async def ensure_collection(client: AsyncClient, collection_name: str) -> Collection:
    # Check DB first
    async for session in get_session():
        statement = select(Collection).where(Collection.name == collection_name)
        result = await session.exec(statement)
        db_coll = result.first()
        
        if db_coll:
            return db_coll
        
        # Create in xAI
        resp = await client.collections.create(collection_name)
        
        # Create in DB
        db_coll = Collection(name=collection_name, xai_id=resp.collection_id)
        session.add(db_coll)
        await session.commit()
        await session.refresh(db_coll)
        return db_coll
    
    raise RuntimeError("Failed to get session")


async def upload_one(
    client: AsyncClient,
    sem: asyncio.Semaphore,
    collection_id: str, # xAI ID
    db_collection_id: int, # DB ID
    doc_path: str,
    meta: Optional[DocMeta],
):
    async with sem:
        name = os.path.basename(doc_path)
        with open(doc_path, "rb") as f:
            data = f.read()

        metadata = build_metadata(
            category=meta.category if meta else None,
            tags=meta.tags if meta else None,
            version=meta.version if meta else None,
            date=meta.date if meta else None,
        )
        upload_kwargs = {
            "collection_id": collection_id,
            "name": name,
            "data": data,
            "content_type": guess_content_type(doc_path),
        }
        if metadata:
            upload_kwargs["metadata"] = metadata
        upload_resp = await client.collections.upload_document(**upload_kwargs)
        document_id = extract_document_id(upload_resp)
        if not document_id:
            raise RuntimeError(f"Upload response missing document_id for: {name}")

        while True:
            status_resp = await client.collections.get_document(document_id, collection_id)
            status = getattr(status_resp, "status", None)
            if status in ("DOCUMENT_STATUS_PROCESSED", STATUS_PROCESSED):
                break
            if status in ("DOCUMENT_STATUS_FAILED", STATUS_FAILED):
                raise RuntimeError(f"Document processing failed: {name} ({document_id})")
            await asyncio.sleep(POLL_INTERVAL_SEC)
            
        # Register in DB
        async for session in get_session():
            doc = Document(
                name=name,
                xai_doc_id=document_id,
                collection_id=db_collection_id,
                status="processed"
            )
            session.add(doc)
            await session.commit()
            break

        return {"name": name, "document_id": document_id}


def iter_files(folder: str):
    for root, _, files in os.walk(folder):
        for fn in files:
            ext = os.path.splitext(fn.lower())[1]
            if ext in SUPPORTED_EXT:
                yield os.path.join(root, fn)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--collection-name", required=True)
    parser.add_argument("--folder", required=True)
    parser.add_argument("--category", default=None)
    parser.add_argument("--tags", default=None, help="comma-separated")
    parser.add_argument("--version", default=None)
    parser.add_argument("--date", default=None)
    args = parser.parse_args()

    api_key = os.getenv("XAI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing XAI_API_KEY")
        
    # Initialize DB
    await init_db()

    client = AsyncClient(api_key=api_key)
    
    # Get or create collection (synced with DB)
    db_collection = await ensure_collection(client, args.collection_name)
    collection_id = db_collection.xai_id
    
    print(f"collection_id={collection_id} (DB ID: {db_collection.id})")

    meta = DocMeta(
        category=args.category,
        tags=[t.strip() for t in args.tags.split(",")] if args.tags else None,
        version=args.version,
        date=args.date,
    )

    sem = asyncio.Semaphore(MAX_CONCURRENCY)
    tasks = []
    for path in iter_files(args.folder):
        tasks.append(upload_one(client, sem, collection_id, db_collection.id, path, meta))

    results = await asyncio.gather(*tasks)
    print(f"uploaded={len(results)}")
    for r in results:
        print(f"- {r['name']}: {r['document_id']}")

if __name__ == "__main__":
    asyncio.run(main())
