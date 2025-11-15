#!/bin/bash
# .env 파일 자동 수정 및 컨테이너 재시작 스크립트
# 사용법: bash apply_env_fix.sh

echo "=========================================="
echo "🔧 .env 파일 수정 및 적용"
echo "=========================================="

cd ~/Revo/backend

echo ""
echo "1️⃣ .env 파일 백업:"
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "   ✅ 백업 완료"

echo ""
echo "2️⃣ .env 파일 수정 중..."
# OPENAI_API_KEY 중복 제거
sed -i 's/^OPENAI_API_KEY=OPENAI_API_KEY=/OPENAI_API_KEY=/' .env
# ALLOWED_ORIGINS 중복 제거
sed -i 's/^ALLOWED_ORIGINS=ALLOWED_ORIGINS=/ALLOWED_ORIGINS=/' .env

echo "   ✅ 수정 완료"

echo ""
echo "3️⃣ 수정된 .env 파일 확인:"
echo "   OPENAI_API_KEY:"
grep "^OPENAI_API_KEY" .env | head -1 | sed 's/\(.\{30\}\).*/\1.../'
echo "   ALLOWED_ORIGINS:"
grep "^ALLOWED_ORIGINS" .env | head -1 | sed 's/\(.\{50\}\).*/\1.../'

echo ""
echo "4️⃣ 컨테이너 완전히 재시작 중..."
docker-compose down
docker-compose up -d

echo ""
echo "5️⃣ 컨테이너 상태 확인:"
sleep 3
docker-compose ps

echo ""
echo "6️⃣ 로그 확인 (최근 10줄):"
docker-compose logs --tail=10 backend

echo ""
echo "=========================================="
echo "✅ 완료!"
echo "=========================================="
echo ""
echo "📋 추가 확인:"
echo "   로그 실시간 확인: docker-compose logs -f backend"
echo "   API 키 확인: bash check_api_key.sh"
echo ""

