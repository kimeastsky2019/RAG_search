# Grok RAG Extended (Collections-based)

## 1) Install
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2) Env
```bash
export XAI_API_KEY=YOUR_KEY
export COLLECTION_NAME=my_rag_collection
```

## 3) Ingest a folder
```bash
python ingest_folder.py --collection-name "$COLLECTION_NAME" --folder ./docs
```
Copy the printed `collection_id` and set:
```bash
export COLLECTION_ID=THE_ID
```

## 4) Run API
```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

## 5) Test
```bash
curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{"query":"문서 핵심 요약해줘","filters":{"category":"policy"}}'
```

## Notes
- `collections_search` tool kwargs (top_k, filters, etc.) may differ by xai-sdk version.
  Adjust in `rag.py` accordingly.