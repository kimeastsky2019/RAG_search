import asyncio
import os
import sys

# Add current directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, select, create_engine
from models import Collection, Document
from rag import run_rag
from xai_sdk import AsyncClient
from config import XAI_API_KEY, XAI_MANAGEMENT_API_KEY

# DB Setup
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rag.db")
engine = create_engine(f"sqlite:///{db_path}")

questions_answers = [
    ("연차는 몇 일인가요?", "근무 1년 미만 15일, 1년 이상 20일"),
    ("재택근무는 언제 가능한가요?", "매주 수요일"),
    ("보너스는 몇 번 주나요?", "연 2회, 3월과 12월"),
]

async def setup_collection(mgmt_client):
    """Finds or creates a collection using Management Client."""
    collection_name = "Evaluation_Policy_Set"
    collection_id = None
    
    # 1. Try to List Collections from Cloud (Management)
    print("Listing remote collections with Management Key...")
    try:
        colls_response = await mgmt_client.collections.list()
        colls = colls_response.collections
        if colls:
            print(f"Found {len(colls)} remote collections.")
            # Search for our specific collection
            for c in colls:
                if c.name == collection_name:
                    print(f"Found existing target collection: {c.name} ({c.collection_id})")
                    collection_id = c.collection_id
                    break
            
            # If not found but collections exist, maybe just return one? 
            # Better to create ours to be sure we have the right data.
    except Exception as e:
        print(f"List collections failed: {e}")

    # 2. Check DB
    if not collection_id:
        try:
            with Session(engine) as session:
                statement = select(Collection).where(Collection.name == collection_name)
                result = session.exec(statement).first()
                if result:
                    print(f"Found existing collection in DB: {result.name} ({result.xai_id})")
                    # We trust DB, but if it doesn't exist in cloud, next steps might fail or we might need to recreate.
                    # Since we have mgmt key now, let's verify if valid? 
                    # For simplicity, if DB says so, we assume it exists or we will recreate if not found in list?
                    # Let's simple use what we found in list or create new.
                    pass 
        except Exception as e:
            print(f"DB Read Error: {e}")

    # 3. Create if not found
    if not collection_id:
        print(f"Creating new collection '{collection_name}'...")
        try:
            resp = await mgmt_client.collections.create(name=collection_name)
            collection_id = resp.collection_id
            print(f"Created xAI collection: {collection_id}")
            
            # Save to DB
            try:
                with Session(engine) as session:
                    new_coll = Collection(name=collection_name, xai_id=str(collection_id))
                    session.add(new_coll)
                    session.commit()
                    print("Saved collection to DB.")
            except Exception as e:
                print(f"DB Save Warning: {e}")

        except Exception as e:
            print(f"Error creating collection: {e}")
            return None
    
    # 4. Upload policy_data.txt
    if collection_id:
        file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "policy_data.txt")
        if os.path.exists(file_path):
            print(f"Uploading {file_path} to {collection_id}...")
            try:
                with open(file_path, "rb") as f:
                    content = f.read()
                
                # Check if document already exists? 
                # xAI API doesn't easily let us check file content hash. 
                # We just upload. If duplicate name, it might create new ID or error.
                upload_resp = await mgmt_client.collections.upload_document(
                    collection_id=collection_id,
                    name="policy_data.txt",
                    data=content
                )
                print(f"DEBUG UPLOAD RESP: {upload_resp}")
                # ID is in file_metadata.file_id
                if hasattr(upload_resp, 'file_metadata') and upload_resp.file_metadata:
                    doc_id = upload_resp.file_metadata.file_id
                    print(f"Uploaded document. ID: {doc_id}")
                else:
                    print("Warning: Could not extract file_id from response")
                    
                print("Waiting 10s for cloud indexing...") # Increased wait time
                await asyncio.sleep(10)
            except Exception as e:
                # If error is about duplicate, we might just proceed.
                print(f"Upload result/info: {e}")
        else:
            print(f"Warning: {file_path} not found.")

    return collection_id

class RagSystemAdapter:
    def __init__(self, chat_client, collection_id):
        self.client = chat_client
        self.collection_id = collection_id

    async def query(self, q: str) -> str:
        # Use run_rag but ensure it passes the chat_client
        res = await run_rag(self.client, self.collection_id, q)
        return res["answer"]

async def evaluate_rag(rag_system):
    correct = 0
    total = len(questions_answers)
    
    print("\n평가 시작 (Chat Client 사용)...")
    for q, expected in questions_answers:
        try:
            answer = await rag_system.query(q)
            is_correct = any(kw.lower() in answer.lower() for kw in expected.split())
            if is_correct:
                correct += 1
                print(f"○ {q}")
            else:
                print(f"× {q}")
                print(f"   기대: {expected}")
                print(f"   실제: {answer.replace(chr(10), ' ')[:100]}...\n")
        except Exception as e:
            print(f"Error executing query '{q}': {e}")
            
    accuracy = correct / total * 100
    print(f"\n정확도: {accuracy:.1f}% ({correct}/{total})")
    return accuracy

async def main():
    if not XAI_API_KEY:
        print("Error: XAI_API_KEY not found.")
        return
    if not XAI_MANAGEMENT_API_KEY:
        print("Error: XAI_MANAGEMENT_API_KEY not found.")
        return

    print(f"Chat Key: {XAI_API_KEY[:10]}...")
    print(f"Mgmt Key: {XAI_MANAGEMENT_API_KEY[:10]}...") 
    
    print("Initializing Clients...")
    chat_client = AsyncClient(api_key=XAI_API_KEY)
    mgmt_client = AsyncClient(management_api_key=XAI_MANAGEMENT_API_KEY)
    
    try:
        # 1. Setup Collection (Management)
        coll_id = await setup_collection(mgmt_client)
        
        if not coll_id:
            print("Cannot proceed without a collection ID.")
            return

        print(f"Using Collection ID: {coll_id}")
        
        # 2. Run Evaluation (Chat)
        rag = RagSystemAdapter(chat_client, coll_id)
        await evaluate_rag(rag)
        
    finally:
        pass

if __name__ == "__main__":
    asyncio.run(main())
