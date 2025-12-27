# 🚀 시스템 업그레이드 계획서: 하이브리드 RAG 전략

## 1. 배경 및 목적
현재 개발 시스템의 속도 저하 문제를 해결하고, 대규모 데이터 처리가 가능한 확장성 있는 검색 증강 생성(RAG) 시스템을 구축하기 위함입니다. 초기에는 **빠른 프로토타입 검증**을 최우선으로 하며, 장기적으로는 **안정적인 대용량 데이터 처리**를 목표로 합니다.

## 2. 전략 개요: 하이브리드 접근 (Hybrid Approach)
속도와 확장성을 동시에 잡기 위해 데이터를 중요도와 규모에 따라 이원화하여 관리하는 전략입니다.

| 구분 | 대상 데이터 | 기술 스택 | 특징 |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Core)** | 핵심 보고서 500 ~ 2,000개 | **Grok Collections** | • 별도 인덱싱 불필요<br>• 즉각적인 테스트 가능<br>• 매우 빠른 응답 속도 |
| **Tier 2 (Mass)** | 나머지 대량 데이터 | **Pinecone + LangChain/LlamaIndex + Grok Embedding** | • 대규모 데이터 확장 용이<br>• 정교한 검색 튜닝 가능<br>• 비용 효율적 관리 |

---

## 3. 단계별 실행 계획 (Roadmap)

### 📅 Phase 1: 고속 프로토타이핑 (Fast Track)
**목표**: 핵심 데이터를 이용해 RAG 시스템의 효용성을 즉시 검증
1. **데이터 선별**: 비즈니스 임팩트가 가장 큰 핵심 보고서 500~2,000개 선별.
2. **Grok Collections 업로드**: 선별된 문서를 Grok Console의 Collections에 업로드.
3. **API 연동**: 기존 애플리케이션(`Rag-extended`)에서 Grok API를 호출할 때 Collection ID를 바인딩하여 질의하도록 수정.
4. **UI/UX 개선**: 사용자 피드백을 빠르게 수집하기 위한 검색 인터페이스 최적화.

### 📅 Phase 2: 대규모 데이터 파이프라인 구축 (Scalable Backend)
**목표**: 대용량 데이터를 처리할 수 있는 자체 벡터 검색 엔진 구축
1. **인프라 셋업**: 
   - **Vector DB**: Pinecone 인스턴스 생성 (Serverless 권장).
   - **Framework**: LangChain 또는 LlamaIndex 도입.
2. **임베딩 파이프라인**: 
   - 대량의 문서를 청크(Chunk) 단위로 분할.
   - **Grok Embedding Model**을 사용하여 벡터화 후 Pinecone에 적재.
3. **검색 로직 구현**: Hybrid Search (키워드 + 벡터) 및 Re-ranking 로직 적용 고려.

### 📅 Phase 3: 하이브리드 통합 및 라우팅 (Orchestration)
**목표**: 사용자가 데이터의 위치를 의식하지 않고 검색할 수 있는 통합 환경 제공
1. **Query Router 구현**: 사용자 질문의 의도나 범위를 파악하여 Grok Collections(Tier 1)을 조회할지, 자체 RAG(Tier 2)를 조회할지 결정하는 로직 추가.
2. **결과 통합**: 필요시 두 소스의 검색 결과를 취합(Merge)하여 답변 생성.

### 📅 Phase 4: 미래 마이그레이션 (Future Migration)
**계획**: Grok Collections 기능이 대규모 데이터를 안정적으로 처리할 수 있는 시점이 오면, 자체 구축한 RAG 파이프라인을 점진적으로 축소하고 Collections로 일원화하여 관리 포인트를 최소화.

---

## 4. 기술 스택 (Tech Stack)

*   **Frontend**: React, Vite, TS (기존 유지)
*   **Backend**: Python (`Rag-extended` 확장)
*   **AI Model**: Grok-beta / Grok-vision-beta
*   **Embedding**: Grok Embeddings
*   **Vector DB**: Pinecone (신규 도입)
*   **Orchestrator**: LangChain or LlamaIndex

## 5. 기대 효과
*   **개발 생산성 향상**: 인덱싱 파이프라인 구축 없이 즉시 RAG 테스트 가능.
*   **성능 최적화**: 핵심 데이터에 대한 초고속 응답 보장.
*   **확장성 확보**: 데이터 양이 늘어나도 Pinecone 기반의 자체 RAG로 유연한 대응 가능.
