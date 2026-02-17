#!/bin/bash
# agent.gngmeta.com nginx 설정 스크립트

SERVER="metal@agent.gngmeta.com"
PEM_KEY="/Users/donghokim/Documents/GnG_Tour/GnGTour/energy-orchestrator-platform.pem"

echo "🔧 agent.gngmeta.com nginx 설정 중..."

# nginx 설정 파일을 서버로 복사
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no nginx_oag.conf "$SERVER:/tmp/nginx_oag.conf"

# 서버에서 설정 추가
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER" "
    # 기존 nginx 설정 파일 위치 확인
    if [ -f /etc/nginx/sites-available/agent.gngmeta.com ]; then
        NGINX_CONF='/etc/nginx/sites-available/agent.gngmeta.com'
    elif [ -f /etc/nginx/conf.d/agent.gngmeta.com.conf ]; then
        NGINX_CONF='/etc/nginx/conf.d/agent.gngmeta.com.conf'
    else
        echo '❌ nginx 설정 파일을 찾을 수 없습니다'
        exit 1
    fi
    
    # 기존 설정 백업
    sudo cp \$NGINX_CONF \${NGINX_CONF}.backup_\$(date +%Y%m%d_%H%M%S)
    
    # /oag 설정 추가 (마지막 }}} 바로 앞에)
    sudo sed -i '
/^}/ {
    i\\
\\
    # --- OAG APP CONFIGURATION ---\
    location = /oag {\
        return 301 /oag/;\
    }\
\\
    location /oag/ {\
        alias /home/metal/ontology/static_root/oag/;\
        try_files \$uri \$uri/ /oag/index.html;\
\\
        if (\$request_uri ~* \\.(html)\$) {\
            add_header Cache-Control \"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0\";\
            expires off;\
        }\
    }\
\\
    location /oag/assets/ {\
        alias /home/metal/ontology/static_root/oag/assets/;\
        try_files \$uri =404;\
        expires 1y;\
        add_header Cache-Control \"public, immutable\";\
        access_log off;\
    }\
\\
    location /oag/api/ {\
        proxy_pass http://127.0.0.1:8000/;\
        proxy_set_header Host \$host;\
        proxy_set_header X-Real-IP \$remote_addr;\
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto \$scheme;\
    }
}
' \$NGINX_CONF
    
    # nginx 테스트
    sudo nginx -t && echo '✓ nginx 설정 확인 완료' || echo '❌ nginx 설정 오류'
    
    # nginx 재시작
    sudo systemctl reload nginx && echo '✅ nginx 적용 완료' || echo '⚠️ nginx 재시작 확인 필요'
"

echo ""
echo "✅ nginx 설정 완료!"
