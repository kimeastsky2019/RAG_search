#!/bin/bash
# xAI Management API 키 업데이트 및 백엔드 재시작 스크립트

SERVER="metal@agent.gngmeta.com"
PEM_KEY="/Users/donghokim/Documents/GnG_Tour/GnGTour/energy-orchestrator-platform.pem"

echo "🔑 xAI Management API 키 업데이트"
echo ""
echo "현재 .env 파일 내용:"
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER" "cat /home/metal/grok-rag/backend/.env"
echo ""
echo ""
read -p "xAI Management API 키를 입력하세요 (xai-로 시작): " XAI_MGMT_KEY

if [ -z "$XAI_MGMT_KEY" ]; then
    echo "❌ 키가 입력되지 않았습니다."
    exit 1
fi

echo ""
echo "📝 .env 파일 업데이트 중..."
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER" << ENDSSH
cd /home/metal/grok-rag/backend

# .env 파일 백업
cp .env .env.backup

# XAI_MANAGEMENT_API_KEY 업데이트
sed -i "s|XAI_MANAGEMENT_API_KEY=.*|XAI_MANAGEMENT_API_KEY=$XAI_MGMT_KEY|" .env

echo "✓ .env 파일 업데이트 완료"
echo ""
echo "업데이트된 .env 내용:"
cat .env | grep XAI
ENDSSH

echo ""
echo "🔄 백엔드 재시작 중..."
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER" << 'ENDSSH'
cd /home/metal/grok-rag/backend

# 기존 프로세스 종료
pkill -f 'uvicorn.*8001' 2>/dev/null || true
sleep 2

# 백엔드 재시작
nohup /home/metal/grok-rag/backend/venv/bin/python3 -m uvicorn app:app --host 0.0.0.0 --port 8001 > logs/app.log 2>&1 &
BACKEND_PID=$!

sleep 3

# 확인
if ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "✓ 백엔드 재시작 완료 (PID: $BACKEND_PID)"
    curl -s http://127.0.0.1:8001/health && echo ""
else
    echo "❌ 백엔드 재시작 실패"
    tail -20 logs/app.log
fi
ENDSSH

echo ""
echo "✅ 완료!"
echo ""
echo "이제 https://agent.gngmeta.com/oag/#/upload 에서 컬렉션 생성이 가능합니다."
