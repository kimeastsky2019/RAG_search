import os
from dotenv import load_dotenv

load_dotenv()

XAI_API_KEY = os.getenv("XAI_API_KEY", "")
XAI_MANAGEMENT_API_KEY = os.getenv("XAI_MANAGEMENT_API_KEY", "")
XAI_MODEL = os.getenv("XAI_MODEL", "grok-4-1-fast")

COLLECTION_NAME = os.getenv("COLLECTION_NAME", "my_rag_collection")
COLLECTION_ID = os.getenv("COLLECTION_ID", "")

# Search params
TOP_K = int(os.getenv("TOP_K", "5"))

# Cache
CACHE_TTL_SEC = int(os.getenv("CACHE_TTL_SEC", "300"))
CACHE_MAXSIZE = int(os.getenv("CACHE_MAXSIZE", "2048"))

# Cost tracking (USD per 1M tokens)
COST_PER_1M_INPUT = float(os.getenv("COST_PER_1M_INPUT", "0.20"))
COST_PER_1M_OUTPUT = float(os.getenv("COST_PER_1M_OUTPUT", "0.50"))

# Guardrail: grounded answers only
SYSTEM_GUARDRAIL = os.getenv(
    "SYSTEM_GUARDRAIL",
    "당신은 사내 문서 기반 RAG 어시스턴트다. "
    "반드시 제공된 컨텍스트(검색 결과)에 근거해 답변하라. "
    "컨텍스트에 없는 내용은 추측하지 말고 '제공된 문서 근거로는 확인할 수 없습니다'라고 답하라. "
    "가능하면 답변 끝에 핵심 근거(문서명/페이지)를 2~5개 bullet로 제공하라."
)
