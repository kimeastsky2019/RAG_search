#!/bin/bash
# agent.gngmeta.com 백엔드 수정 스크립트

SERVER="metal@agent.gngmeta.com"
PEM_KEY="/Users/donghokim/Documents/GnG_Tour/GnGTour/energy-orchestrator-platform.pem"

echo "🔧 agent.gngmeta.com 백엔드 수정 중..."

# 필요한 파일 전송
echo "📤 파일 전송 중..."
cd /Users/donghokim/Documents/Ontology/RAG_Ontology
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no \
    Rag-extended/cache.py \
    Rag-extended/rag.py \
    Rag-extended/filters.py \
    Rag-extended/xai_helpers.py \
    Rag-extended/citations.py \
    Rag-extended/retriever.py \
    Rag-extended/generator.py \
    "$SERVER:/home/metal/grok-rag/backend/"

# 백엔드 시작
echo "🚀 백엔드 시작 중..."
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER" << 'ENDSSH'
cd /home/metal/grok-rag/backend

# 기존 프로세스 종료
pkill -f 'uvicorn.*8001' 2>/dev/null || true
sleep 1

# 백엔드 시작
source venv/bin/activate
mkdir -p logs
nohup uvicorn app:app --host 0.0.0.0 --port 8001 > logs/app.log 2>&1 &
sleep 3

# 확인
if curl -s http://127.0.0.1:8001/health > /dev/null; then
    echo "✓ 백엔드 시작 완료"
    curl -s -X POST http://127.0.0.1:8001/token -H 'Content-Type: application/x-www-form-urlencoded' -d 'username=info@gngmeta.com&password=admin1234' | head -1
else
    echo "❌ 백엔드 시작 실패"
    tail -20 logs/app.log
fi
ENDSSH

# nginx 설정 업데이트
echo "🔧 nginx 설정 업데이트 중..."
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER" "
sudo sed -i 's|proxy_pass http://127.0.0.1:8000/;|proxy_pass http://127.0.0.1:8001/;|g' /etc/nginx/sites-available/agent.gngmeta.com
sudo nginx -t && sudo systemctl reload nginx && echo '✓ nginx 업데이트 완료'
"

echo ""
echo "✅ 완료!"
echo "📍 테스트: https://agent.gngmeta.com/oag/api/health"
