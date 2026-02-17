#!/bin/bash
# agent.gngmeta.com 백엔드 시작 스크립트

SERVER="metal@agent.gngmeta.com"
PEM_KEY="/Users/donghokim/Documents/GnG_Tour/GnGTour/energy-orchestrator-platform.pem"

echo "🚀 agent.gngmeta.com 백엔드 시작 중..."

ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER" << 'ENDSSH'
cd /home/metal/grok-rag/backend

# 기존 프로세스 종료
pkill -f 'uvicorn.*8001' 2>/dev/null || true
sleep 2

# 가상환경의 Python과 uvicorn 직접 사용
nohup /home/metal/grok-rag/backend/venv/bin/python3 -m uvicorn app:app --host 0.0.0.0 --port 8001 > logs/app.log 2>&1 &
BACKEND_PID=$!
echo "백엔드 PID: $BACKEND_PID"

sleep 6

# 확인
if ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "✓ 백엔드 실행 중"
    curl -s http://127.0.0.1:8001/health
    echo ""
    curl -s -X POST http://127.0.0.1:8001/token -H 'Content-Type: application/x-www-form-urlencoded' -d 'username=info@gngmeta.com&password=admin1234'
else
    echo "❌ 백엔드 시작 실패"
    tail -30 logs/app.log
fi
ENDSSH

echo ""
echo "✅ 완료!"
