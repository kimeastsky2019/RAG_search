import os
import requests
import streamlit as st

API_BASE = os.getenv("API_BASE", "http://localhost:8000")

st.title("Grok RAG Extended")

q = st.text_input("질문")

with st.expander("필터"):
    category = st.text_input("category")
    tags_str = st.text_input("tags (comma)")
    version = st.text_input("version")
    date_from = st.text_input("date_from (YYYY-MM-DD)")
    date_to = st.text_input("date_to (YYYY-MM-DD)")

if st.button("질의"):
    if not q.strip():
        st.warning("질문을 입력하세요")
    else:
        filters = {}
        if category.strip(): filters["category"] = category.strip()
        if tags_str.strip(): filters["tags"] = [t.strip() for t in tags_str.split(",") if t.strip()]
        if version.strip(): filters["version"] = version.strip()
        if date_from.strip(): filters["date_from"] = date_from.strip()
        if date_to.strip(): filters["date_to"] = date_to.strip()

        payload = {"query": q, "filters": filters or None}
        r = requests.post(f"{API_BASE}/chat", json=payload, timeout=120)
        if r.status_code != 200:
            st.error(r.text)
        else:
            data = r.json()
            st.caption(f"request_id={data['request_id']} | cached={data['cached']} | latency={data['latency_ms']}ms")
            st.subheader("답변")
            st.write(data["answer"])

            if data.get("citations"):
                st.subheader("근거")
                st.json(data["citations"])
