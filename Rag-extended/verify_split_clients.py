import os
import sys
from dotenv import load_dotenv
# Ensure local path is in sys.path if needed, though dotenv should handle .env
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from xai_sdk import Client

# Load env vars explicitly in case
load_dotenv()

XAI_MANAGEMENT_API_KEY = os.getenv("XAI_MANAGEMENT_API_KEY")
XAI_API_KEY = os.getenv("XAI_API_KEY")

print(f"Management Key loaded: {XAI_MANAGEMENT_API_KEY[:10]}..." if XAI_MANAGEMENT_API_KEY else "No Mgmt Key")
print(f"Chat Key loaded: {XAI_API_KEY[:10]}..." if XAI_API_KEY else "No Chat Key")

# 1. 채팅(RAG) 전용 클라이언트
chat_client = Client(api_key=XAI_API_KEY)

# 2. 컬렉션 관리 전용 클라이언트
# SDK expects management_api_key for collection operations
mgmt_client = Client(management_api_key=XAI_MANAGEMENT_API_KEY)

print("-" * 30)
print("검증 시작...")

try:
    collections = mgmt_client.collections.list()
    print("🎉 성공! 관리 키가 제대로 동작합니다.")
    print("Collections response:", collections)
    print("Attributes:", dir(collections))
    # Assuming .collections is the list
    if hasattr(collections, 'collections'):
        print(f"현재 컬렉션 수: {len(collections.collections)}")
        for c in collections.collections:
            print(f" - {c.name} ({c.collection_id})")
    else:
        print("Not iterable directly?")
except Exception as e:
    import traceback
    traceback.print_exc()
    print("❌ 아직 안 됨:", str(e))
    print("TIP: xAI Console에서 해당 API Key가 'Management' 권한(Read/Write)을 가지고 있는지 확인해주세요.")
