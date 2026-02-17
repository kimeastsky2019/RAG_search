#!/bin/bash
# agent.gngmeta.com에 RAG 백엔드 설정 스크립트

SERVER="metal@agent.gngmeta.com"
PEM_KEY="/Users/donghokim/Documents/GnG_Tour/GnGTour/energy-orchestrator-platform.pem"

echo "🚀 agent.gngmeta.com RAG 백엔드 설정 중..."

# 프로젝트 구조 생성
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER" "
    mkdir -p /home/metal/grok-rag/backend
    cd /home/metal/grok-rag/backend
    
    # Python 환경 설정
    if [ ! -d venv ]; then
        python3 -m venv venv
        echo '✓ Python 가상환경 생성'
    fi
    
    source venv/bin/activate
    
    # 필수 패키지 설치
    pip install -U pip setuptools wheel 2>&1 | tail -1
    pip install fastapi uvicorn sqlmodel sqlalchemy python-jose[cryptography] passlib[bcrypt] python-dotenv xai-sdk 2>&1 | tail -1
    
    echo '✓ 패키지 설치 완료'
    
    # 디렉토리 구조
    mkdir -p /home/metal/grok-rag/backend/{app,migrations}
    mkdir -p /home/metal/grok-rag/backend/logs
    mkdir -p /home/metal/grok-rag/backend/data
    
    echo '✓ 디렉토리 구조 생성 완료'
"

# 필요한 파일들 전송
echo "📤 백엔드 파일 전송 중..."

# Rag-extended 디렉토리에서 필요한 파일 복사
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no /Users/donghokim/Documents/Ontology/RAG_Ontology/Rag-extended/app.py "$SERVER:/tmp/rag_app.py"
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no /Users/donghokim/Documents/Ontology/RAG_Ontology/Rag-extended/config.py "$SERVER:/tmp/rag_config.py"
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no /Users/donghokim/Documents/Ontology/RAG_Ontology/Rag-extended/models.py "$SERVER:/tmp/rag_models.py"
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no /Users/donghokim/Documents/Ontology/RAG_Ontology/Rag-extended/database.py "$SERVER:/tmp/rag_database.py"
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no /Users/donghokim/Documents/Ontology/RAG_Ontology/Rag-extended/auth_utils.py "$SERVER:/tmp/rag_auth_utils.py"

echo '✓ 파일 전송 완료'

# 파일 이동
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER" "
    cd /home/metal/grok-rag/backend
    cp /tmp/rag_app.py app.py
    cp /tmp/rag_config.py config.py
    cp /tmp/rag_models.py models.py
    cp /tmp/rag_database.py database.py
    cp /tmp/rag_auth_utils.py auth_utils.py
    rm -f /tmp/rag_*.py
    
    # .env 파일 생성 (필요시 수정)
    cat > .env << 'ENVEOF'
XAI_API_KEY=your_api_key_here
XAI_MANAGEMENT_API_KEY=your_management_api_key_here
XAI_MODEL=grok-4-1-fast
DATABASE_URL=sqlite:///./rag.db
CORS_ORIGINS=*
ENVEOF
    
    echo '✓ 백엔드 파일 설정 완료'
"

echo ""
echo "✅ RAG 백엔드 설정 완료!"
echo ""
echo "다음 단계:"
echo "1. .env 파일에서 XAI API 키 설정"
echo "2. 백엔드 시작: sudo systemctl start grok-rag-backend (또는 직접 실행)"
echo ""
echo "시작 명령어 (테스트):"
echo "  cd /home/metal/grok-rag/backend"
echo "  source venv/bin/activate"
echo "  uvicorn app:app --host 0.0.0.0 --port 8000"
