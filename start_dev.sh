#!/bin/bash
# 개발 서버 시작 스크립트

cd "$(dirname "$0")"

echo "🚀 개발 서버를 시작합니다..."
echo "📍 서버 주소: http://localhost:8080/oag/"
echo ""
echo "서버를 중지하려면 Ctrl+C를 누르세요."
echo ""

npm run dev

