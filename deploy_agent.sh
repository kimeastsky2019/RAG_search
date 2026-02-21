#!/bin/bash
# 배포 스크립트 - agent.gngmeta.com

SERVER="metal@agent.gngmeta.com"
PEM_KEY="/Users/donghokim/Documents/GnG_Tour/GnGTour/energy-orchestrator-platform.pem"
REMOTE_PATH="/home/metal/ontology/static_root/oag"
LOCAL_DIST="./dist"

echo "🚀 배포를 시작합니다..."
echo "서버: $SERVER"
echo "원격 경로: $REMOTE_PATH"
echo ""

# PEM 키 권한 확인 및 설정
if [ -f "$PEM_KEY" ]; then
    chmod 400 "$PEM_KEY" 2>/dev/null || true
    echo "✓ PEM 키 확인됨"
else
    echo "❌ PEM 키를 찾을 수 없습니다: $PEM_KEY"
    exit 1
fi

# dist 폴더 확인
if [ ! -d "$LOCAL_DIST" ]; then
    echo "❌ dist 폴더가 없습니다. 먼저 'npm run build'를 실행하세요."
    exit 1
fi

echo "📦 파일 전송 중..."
# 원격 디렉토리 생성
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER" "mkdir -p $REMOTE_PATH"

# 기존 파일 백업 (있는 경우)
echo "💾 기존 파일 백업 중..."
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER" "
    if [ -d $REMOTE_PATH ]; then
        if [ -d ${REMOTE_PATH}_backup ]; then
            rm -rf ${REMOTE_PATH}_backup
        fi
        mv $REMOTE_PATH ${REMOTE_PATH}_backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    fi
    mkdir -p $REMOTE_PATH
"

# 파일 전송 (scp 사용)
echo "📤 dist 폴더를 압축 중..."
cd "$LOCAL_DIST/.."
tar -czf /tmp/dist_deploy.tar.gz -C dist .

echo "📡 서버로 파일 전송 중..."
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no /tmp/dist_deploy.tar.gz "$SERVER:/tmp/"

if [ $? -ne 0 ]; then
    echo "❌ 파일 전송 실패"
    rm -f /tmp/dist_deploy.tar.gz
    exit 1
fi

echo "📦 서버에서 파일 압축 해제 중..."
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER" "
    cd $REMOTE_PATH
    tar -xzf /tmp/dist_deploy.tar.gz
    rm -f /tmp/dist_deploy.tar.gz
    chmod -R 755 $REMOTE_PATH
    echo '✓ 파일 배포 완료'
"

# 로컬 임시 파일 정리
rm -f /tmp/dist_deploy.tar.gz

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 배포 완료!"
    echo "📍 접속 URL: https://agent.gngmeta.com/oag/"
    echo ""
    echo "⚠️  참고: nginx 설정에서 /oag/ 경로가 올바르게 설정되어 있는지 확인하세요."
    echo "   nginx 설정 파일: nginx_agent_oag.conf"
else
    echo "❌ 배포 실패"
    exit 1
fi
