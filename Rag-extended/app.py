from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Form, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
from sqlmodel import select
from sqlalchemy import func
from sqlalchemy import delete, func
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import timedelta
from typing import Optional
import uuid
import time
from xai_sdk import AsyncClient

from config import XAI_API_KEY, XAI_MANAGEMENT_API_KEY, XAI_MODEL, COST_PER_1M_INPUT, COST_PER_1M_OUTPUT
from xai_sdk.proto import collections_pb2
from cache import cache_get, cache_set
from rag import run_rag
from database import init_db, get_session
from models import Collection, Document, User, UsageEvent
from ingest_folder import guess_content_type
from filters import build_metadata
from xai_helpers import extract_document_id, delete_collection_document
from auth_utils import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

# Setup lifecycle management for DB init
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    
    # Create default user if not exists (for convenience)
    async for session in get_session():
        statement = select(User).where(User.email == "info@gngmeta.com")
        results = await session.exec(statement)
        user = results.first()
        if not user:
            default_user = User(
                email="info@gngmeta.com",
                hashed_password=get_password_hash("admin1234"), 
                full_name="GnG Admin"
            )
            session.add(default_user)
            await session.commit()
        break
        
    yield

app = FastAPI(title="Grok RAG Extended API", lifespan=lifespan)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not XAI_API_KEY:
    print("Warning: XAI_API_KEY is missing. RAG features will fail.")

# Chat Client
try:
    chat_client = AsyncClient(api_key=XAI_API_KEY or "dummy_key")
except:
    chat_client = None

# Management Client
try:
    if XAI_MANAGEMENT_API_KEY:
        mgmt_client = AsyncClient(management_api_key=XAI_MANAGEMENT_API_KEY)
    else:
        print("Warning: XAI_MANAGEMENT_API_KEY missing. Collections ops will fail.")
        mgmt_client = None
except:
    mgmt_client = None
    
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

STATUS_PROCESSED = collections_pb2.DocumentStatus.DOCUMENT_STATUS_PROCESSED
STATUS_FAILED = collections_pb2.DocumentStatus.DOCUMENT_STATUS_FAILED

def _status_is_processed(status: object) -> bool:
    return status in ("DOCUMENT_STATUS_PROCESSED", STATUS_PROCESSED)

def _status_is_failed(status: object) -> bool:
    return status in ("DOCUMENT_STATUS_FAILED", STATUS_FAILED)

async def get_current_user(token: str = Depends(oauth2_scheme), session: AsyncSession = Depends(get_session)):
    from jose import JWTError, jwt
    from auth_utils import SECRET_KEY, ALGORITHM
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError as e:
        print(f"DEBUG: JWT Validation Error: {str(e)}")
        raise credentials_exception
        
    statement = select(User).where(User.email == email)
    result = await session.exec(statement)
    user = result.first()
    if user is None:
        raise credentials_exception
    return user


class Filters(BaseModel):
    category: str | None = None
    tags: list[str] | None = None
    version: str | None = None
    date_from: str | None = None
    date_to: str | None = None


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1)
    collection_id: Optional[int] = None
    filters: Filters | None = None


class ChatResponse(BaseModel):
    request_id: str
    answer: str
    citations: list[dict] = []
    cached: bool
    latency_ms: int

class CollectionCreate(BaseModel):
    name: str

class CollectionRead(BaseModel):
    id: int
    name: str
    xai_id: str
    created_at: str
    documents_count: int | None = None
    processing_count: int | None = None
    failed_count: int | None = None
    status: str | None = None

class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class UserRead(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: AsyncSession = Depends(get_session)):
    statement = select(User).where(User.email == form_data.username)
    result = await session.exec(statement)
    user = result.first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/register", response_model=UserRead)
async def register(user_in: UserCreate, session: AsyncSession = Depends(get_session)):
    statement = select(User).where(User.email == user_in.email)
    result = await session.exec(statement)
    if result.first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return UserRead(id=user.id, email=user.email, full_name=user.full_name)

@app.get("/users/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return UserRead(id=current_user.id, email=current_user.email, full_name=current_user.full_name)


@app.get("/health")
async def health():
    return {"ok": True, "model": XAI_MODEL}

@app.get("/stats")
async def get_stats(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Total collections
    result = await session.exec(select(func.count(Collection.id)))
    total_collections = result.one()
    
    # Total documents
    result = await session.exec(select(func.count(Document.id)))
    total_documents = result.one()
    
    # Active users (just total users for now)
    result = await session.exec(select(func.count(User.id)))
    total_users = result.one()
    
    # Total queries (from usage events)
    result = await session.exec(select(func.count(UsageEvent.id)))
    total_queries = result.one()

    # Average latency (ms)
    result = await session.exec(select(func.avg(UsageEvent.latency_ms)))
    avg_latency = result.one() or 0

    # Total cost (USD)
    result = await session.exec(select(func.sum(UsageEvent.cost_usd)))
    total_cost = result.one() or 0

    return {
        "collections": total_collections,
        "documents": total_documents,
        "users": total_users,
        "queries": total_queries,
        "avg_latency_ms": int(avg_latency),
        "cost_usd": float(total_cost),
    }

@app.get("/collections", response_model=list[CollectionRead])
async def list_collections(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user) # Require login
):
    result = await session.exec(select(Collection))
    collections = result.all()
    # verify format
    output: list[CollectionRead] = []
    for c in collections:
        total_docs = (await session.exec(
            select(func.count(Document.id)).where(Document.collection_id == c.id)
        )).one()
        processing_docs = (await session.exec(
            select(func.count(Document.id)).where(
                (Document.collection_id == c.id) & (Document.status == "processing")
            )
        )).one()
        failed_docs = (await session.exec(
            select(func.count(Document.id)).where(
                (Document.collection_id == c.id) & (Document.status == "failed")
            )
        )).one()
        output.append(
            CollectionRead(
                id=c.id,
                name=c.name,
                xai_id=c.xai_id,
                created_at=c.created_at.isoformat(),
                documents_count=total_docs,
                processing_count=processing_docs,
                failed_count=failed_docs,
                status="processing" if processing_docs > 0 else "active",
            )
        )
    return output

@app.post("/collections", response_model=CollectionRead)
async def create_collection(
    collection: CollectionCreate, 
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not mgmt_client:
         raise HTTPException(status_code=500, detail="Management API Key not configured")

    # Create in xAI
    try:
        resp = await mgmt_client.collections.create(name=collection.name)
        xai_id = resp.collection_id
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"xAI Error: {str(e)}")

    # Create in DB
    db_collection = Collection(name=collection.name, xai_id=xai_id)
    session.add(db_collection)
    await session.commit()
    await session.refresh(db_collection)
    
    return CollectionRead(
        id=db_collection.id, 
        name=db_collection.name, 
        xai_id=db_collection.xai_id, 
        created_at=db_collection.created_at.isoformat()
    )

@app.delete("/collections/{collection_id}")
async def delete_collection(
    collection_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not mgmt_client:
         raise HTTPException(status_code=500, detail="Management API Key not configured")

    collection = await session.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
        
    # Attempt to delete from xAI
    try:
        await mgmt_client.collections.delete(collection_id=collection.xai_id)
    except Exception as e:
        print(f"Warning: Failed to delete collection from xAI: {e}")
        # Proceed with DB deletion
    
    # Use direct SQL delete for robustness
    try:
        # Delete dependent documents
        await session.exec(delete(Document).where(Document.collection_id == collection_id))
        # Delete collection
        await session.exec(delete(Collection).where(Collection.id == collection_id))
        await session.commit()
    except Exception as e:
        print(f"Error deleting collection from DB: {e}")
        raise HTTPException(status_code=500, detail=f"Database Delete Error: {e}")
    
    return {"status": "deleted", "id": collection_id}

class DocumentRead(BaseModel):
    id: int
    name: str
    xai_doc_id: str
    status: str
    created_at: str

@app.get("/collections/{collection_id}", response_model=list[DocumentRead])
async def get_collection_documents(
    collection_id: int,
    session: AsyncSession = Depends(get_session),
    refresh: bool = False,
    current_user: User = Depends(get_current_user)
):
    collection = await session.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Check if documents relationship is loaded or query them
    # Since we are using SQLModel async, we likely need to query explicitly if not joined
    # Or just select docs
    statement = select(Document).where(Document.collection_id == collection_id)
    results = await session.exec(statement)
    documents = results.all()

    if refresh and mgmt_client and documents:
        updated = False
        for doc in documents:
            if doc.status == "processed":
                continue
            try:
                status_resp = await mgmt_client.collections.get_document(
                    doc.xai_doc_id,
                    collection.xai_id,
                )
                status = getattr(status_resp, "status", None)
                if _status_is_processed(status):
                    doc.status = "processed"
                    updated = True
                elif _status_is_failed(status):
                    doc.status = "failed"
                    updated = True
            except Exception as e:
                print(f"Warning: status check failed for {doc.xai_doc_id}: {e}")
        if updated:
            await session.commit()

    return [
        DocumentRead(
            id=d.id,
            name=d.name,
            xai_doc_id=d.xai_doc_id,
            status=d.status,
            created_at=d.created_at.isoformat()
        ) for d in documents
    ]

@app.delete("/documents/{document_id}")
async def delete_document(
    document_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not mgmt_client:
         raise HTTPException(status_code=500, detail="Management API Key not configured")

    doc = await session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Attempt to delete from xAI
    try:
        collection = await session.get(Collection, doc.collection_id)
        if not collection:
            raise Exception("Collection not found for document")
        await delete_collection_document(mgmt_client, collection.xai_id, doc.xai_doc_id)
    except Exception as e:
        print(f"Warning: Failed to delete from xAI: {e}")
        # Proceed to delete from DB anyway so user isn't stuck
        
    session.delete(doc)
    await session.commit()
    
    return {"status": "deleted", "id": document_id}

@app.post("/collections/{collection_id}/upload")
async def upload_document(
    collection_id: int,
    file: UploadFile = File(...),
    category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    version: Optional[str] = Form(None),
    date: Optional[str] = Form(None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not mgmt_client:
         raise HTTPException(status_code=500, detail="Management API Key not configured")

    # Get collection
    collection = await session.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Read file content
    content = await file.read()
    
    metadata = build_metadata(
        category=category,
        tags=tags,
        version=version,
        date=date,
    )

    # Upload to xAI
    try:
        # NOTE: content_type is deprecated/unsupported in latest SDK
        upload_kwargs = {
            "collection_id": collection.xai_id,
            "name": file.filename,
            "data": content,
        }
        if metadata:
            upload_kwargs["metadata"] = metadata
        upload_resp = await mgmt_client.collections.upload_document(**upload_kwargs)
        xai_doc_id = extract_document_id(upload_resp)
        if not xai_doc_id:
            raise Exception("Could not find document_id in upload response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"xAI Upload Error: {str(e)}")
    
    # Save to DB
    doc = Document(
        name=file.filename,
        xai_doc_id=xai_doc_id,
        collection_id=collection.id,
        status="processing" # You might want to poll status in background
    )
    session.add(doc)
    await session.commit()
    
    return {"status": "uploaded", "document_id": doc.id, "xai_doc_id": xai_doc_id}

@app.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest, 
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Determine Collection ID
    target_xai_id = None
    db_collection: Collection | None = None
    if req.collection_id:
        coll = await session.get(Collection, req.collection_id)
        if coll:
            target_xai_id = coll.xai_id
            db_collection = coll
    
    # Fallback to default if not provided, or error
    if not target_xai_id:
        # Priority 1: Check for "Core Reports" (Phase 1 Strategy)
        statement = select(Collection).where(Collection.name == "Core Reports")
        result = await session.exec(statement)
        core_coll = result.first()
        
        if core_coll:
            target_xai_id = core_coll.xai_id
            db_collection = core_coll
        else:
            # Priority 2: Use most recent collection
            result = await session.exec(select(Collection).order_by(Collection.created_at.desc()).limit(1))
            first_coll = result.first()
            if first_coll:
                target_xai_id = first_coll.xai_id
                db_collection = first_coll
            else:
                # Fallback to config if available
                from config import COLLECTION_ID
                if COLLECTION_ID:
                    target_xai_id = COLLECTION_ID
                else:
                    raise HTTPException(status_code=400, detail="No collection specified and none found in DB")

    request_id = str(uuid.uuid4())
    t0 = time.time()

    if db_collection:
        result = await session.exec(
            select(Document).where(Document.collection_id == db_collection.id)
        )
        docs = result.all()
        if not docs:
            latency_ms = int((time.time() - t0) * 1000)
            return ChatResponse(
                request_id=request_id,
                answer="업로드된 문서가 없습니다. 먼저 문서를 업로드해 주세요.",
                citations=[],
                cached=False,
                latency_ms=latency_ms,
            )
        if mgmt_client:
            updated = False
            for doc in docs:
                if doc.status == "processed":
                    continue
                try:
                    status_resp = await mgmt_client.collections.get_document(
                        doc.xai_doc_id,
                        db_collection.xai_id,
                    )
                    status = getattr(status_resp, "status", None)
                    if _status_is_processed(status):
                        doc.status = "processed"
                        updated = True
                    elif _status_is_failed(status):
                        doc.status = "failed"
                        updated = True
                except Exception as e:
                    print(f"Warning: status check failed for {doc.xai_doc_id}: {e}")
            if updated:
                await session.commit()

            if not any(d.status == "processed" for d in docs):
                latency_ms = int((time.time() - t0) * 1000)
                return ChatResponse(
                    request_id=request_id,
                    answer=(
                        "문서가 아직 인덱싱 중입니다. 잠시 후 다시 시도해 주세요.\n\n"
                        "1) 인덱싱 대기 (가장 흔함)\n"
                        "- 보통 몇 초~10분, 큰 파일은 30분까지 걸릴 수 있습니다.\n"
                        "- 5~10분 뒤 다시 검색해 주세요.\n\n"
                        "2) 문서 상태 확인 (추천)\n"
                        "- xAI 콘솔에서 해당 컬렉션 문서 상태가 processed인지 확인하세요.\n"
                        "- processing이면 기다리면 됩니다.\n"
                        "- failed면 파일을 다시 업로드해 주세요.\n\n"
                        "3) 빠른 점검\n"
                        "- 작은 텍스트(.txt) 1개로 업로드/검색이 되는지 테스트해 보세요.\n"
                        "- 된다면 원본 파일이 크거나 복잡해 처리 지연일 가능성이 큽니다."
                    ),
                    citations=[],
                    cached=False,
                    latency_ms=latency_ms,
                )

    filters_dict = req.filters.model_dump(exclude_none=True) if req.filters else None

    # Cache key now needs to include collection
    cached = cache_get(target_xai_id, XAI_MODEL, req.query, filters_dict)
    if cached:
        latency_ms = int((time.time() - t0) * 1000)
        return ChatResponse(
            request_id=request_id,
            answer=cached["answer"],
            citations=cached.get("citations", []),
            cached=True,
            latency_ms=latency_ms,
        )

    result = await run_rag(
        client=chat_client,
        collection_id=target_xai_id,
        query=req.query,
        filters=filters_dict,
    )

    # Track usage when not cached
    usage = result.get("usage") if isinstance(result, dict) else None
    prompt_tokens = usage.get("prompt_tokens") if usage else None
    completion_tokens = usage.get("completion_tokens") if usage else None
    total_tokens = usage.get("total_tokens") if usage else None
    cost = 0.0
    if prompt_tokens is not None and completion_tokens is not None:
        cost = (prompt_tokens / 1_000_000) * COST_PER_1M_INPUT + (completion_tokens / 1_000_000) * COST_PER_1M_OUTPUT

    try:
        usage_event = UsageEvent(
            endpoint="/chat",
            model=XAI_MODEL,
            collection_id=db_collection.id if db_collection else None,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cost_usd=cost,
            latency_ms=result.get("latency_ms"),
            cached=False,
        )
        session.add(usage_event)
        await session.commit()
    except Exception as e:
        print(f"Warning: failed to record usage: {e}")

    cache_set(target_xai_id, XAI_MODEL, req.query, filters_dict, result)

    latency_ms = int((time.time() - t0) * 1000)
    return ChatResponse(
        request_id=request_id,
        answer=result["answer"],
        citations=result.get("citations", []),
        cached=False,
        latency_ms=latency_ms,
    )
