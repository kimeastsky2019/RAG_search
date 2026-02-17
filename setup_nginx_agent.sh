#!/bin/bash
# nginx 설정 배포 스크립트 - agent.gngmeta.com

SERVER="metal@agent.gngmeta.com"
PEM_KEY="/Users/donghokim/Documents/GnG_Tour/GnGTour/energy-orchestrator-platform.pem"
NGINX_CONFIG="nginx_agent_oag.conf"
REMOTE_NGINX_PATH="/etc/nginx/sites-available/agent.gngmeta.com"
REMOTE_NGINX_ENABLED="/etc/nginx/sites-enabled/agent.gngmeta.com"

echo "🔧 nginx 설정을 배포합니다..."
echo "서버: $SERVER"
echo "설정 파일: $NGINX_CONFIG"
echo ""

# PEM 키 권한 확인 및 설정
if [ -f "$PEM_KEY" ]; then
    chmod 400 "$PEM_KEY" 2>/dev/null || true
    echo "✓ PEM 키 확인됨"
else
    echo "❌ PEM 키를 찾을 수 없습니다: $PEM_KEY"
    exit 1
fi

# 로컬 설정 파일 확인
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ 설정 파일을 찾을 수 없습니다: $NGINX_CONFIG"
    exit 1
fi

echo "📤 nginx 설정 파일 전송 중..."
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no "$NGINX_CONFIG" "$SERVER:/tmp/agent.gngmeta.com"

if [ $? -ne 0 ]; then
    echo "❌ 파일 전송 실패"
    exit 1
fi

echo "📦 서버에서 nginx 설정 적용 중..."
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER" "
    # 기존 설정 백업
    if [ -f $REMOTE_NGINX_PATH ]; then
        sudo cp $REMOTE_NGINX_PATH ${REMOTE_NGINX_PATH}.backup.\$(date +%Y%m%d_%H%M%S)
        echo '✓ 기존 설정 백업 완료'
    fi
    
    # 새 설정 파일 복사
    sudo mv /tmp/agent.gngmeta.com $REMOTE_NGINX_PATH
    sudo chown root:root $REMOTE_NGINX_PATH
    sudo chmod 644 $REMOTE_NGINX_PATH
    
    # sites-enabled에 심볼릭 링크 생성
    if [ ! -L $REMOTE_NGINX_ENABLED ]; then
        sudo ln -s $REMOTE_NGINX_PATH $REMOTE_NGINX_ENABLED
        echo '✓ 심볼릭 링크 생성 완료'
    fi
    
    # nginx 설정 테스트
    echo '🔍 nginx 설정 테스트 중...'
    sudo nginx -t
    
    if [ \$? -eq 0 ]; then
        echo '✓ nginx 설정 검증 완료'
        echo '⚠️  nginx를 재시작하려면: sudo systemctl reload nginx'
    else
        echo '❌ nginx 설정 오류 발견'
        exit 1
    fi
"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ nginx 설정 배포 완료!"
    echo ""
    echo "⚠️  다음 단계:"
    echo "   1. SSL 인증서가 설정되어 있는지 확인하세요"
    echo "   2. 서버에서 다음 명령어로 nginx를 재시작하세요:"
    echo "      ssh -i $PEM_KEY $SERVER 'sudo systemctl reload nginx'"
    echo "   3. 또는 수동으로:"
    echo "      ssh -i $PEM_KEY $SERVER"
    echo "      sudo systemctl reload nginx"
else
    echo "❌ nginx 설정 배포 실패"
    exit 1
fi
