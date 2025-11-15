#!/bin/bash
# API 키 확인 스크립트 (도커 컨테이너 내부)
# 사용법: ./check_api_key.sh

echo "=========================================="
echo "🔍 API 키 확인"
echo "=========================================="

echo ""
echo "1️⃣ 호스트 환경변수 확인:"
echo "   OPENAI_API_KEY 존재: $([ -n "$OPENAI_API_KEY" ] && echo '✅ 있음' || echo '❌ 없음')"
if [ -n "$OPENAI_API_KEY" ]; then
    echo "   키 길이: ${#OPENAI_API_KEY}"
    echo "   키 앞 4자: ${OPENAI_API_KEY:0:4}..."
fi

echo ""
echo "2️⃣ .env 파일 확인:"
if [ -f .env ]; then
    echo "   ✅ .env 파일 존재"
    if grep -q "OPENAI_API_KEY" .env; then
        echo "   ✅ OPENAI_API_KEY 설정됨"
        KEY_LINE=$(grep "OPENAI_API_KEY" .env | head -1)
        KEY_LENGTH=$(echo "$KEY_LINE" | cut -d'=' -f2 | tr -d ' ' | wc -c)
        echo "   키 길이: $((KEY_LENGTH - 1))"
    else
        echo "   ❌ OPENAI_API_KEY 없음"
    fi
else
    echo "   ❌ .env 파일 없음"
fi

echo ""
echo "3️⃣ Docker 컨테이너 내부 확인:"
CONTAINER_ID=$(docker-compose ps -q backend 2>/dev/null)
if [ -n "$CONTAINER_ID" ]; then
    echo "   컨테이너 ID: $CONTAINER_ID"
    echo ""
    echo "   컨테이너 내부 환경변수:"
    docker exec $CONTAINER_ID env | grep OPENAI_API_KEY || echo "   ❌ OPENAI_API_KEY 환경변수 없음"
    echo ""
    echo "   컨테이너 내부 .env 파일:"
    docker exec $CONTAINER_ID test -f /app/.env && echo "   ✅ .env 파일 존재" || echo "   ❌ .env 파일 없음"
    echo ""
    echo "   Python에서 API 키 확인:"
    docker exec $CONTAINER_ID python -c "
import os
from pathlib import Path
from dotenv import load_dotenv

# 환경변수 확인
api_key_env = os.getenv('OPENAI_API_KEY')
print(f'환경변수 OPENAI_API_KEY: {\"있음\" if api_key_env else \"없음\"}')

# .env 파일 확인
env_path = Path('/app/.env')
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    api_key_dotenv = os.getenv('OPENAI_API_KEY')
    print(f'.env 파일 로드 후: {\"있음\" if api_key_dotenv else \"없음\"}')
else:
    print('.env 파일 없음')

# 최종 확인
final_key = os.getenv('OPENAI_API_KEY')
if final_key:
    print(f'✅ 최종 API 키: 있음 (길이: {len(final_key)})')
    print(f'   앞 4자: {final_key[:4]}...')
else:
    print('❌ 최종 API 키: 없음')
" 2>/dev/null || echo "   ❌ Python 실행 실패"
else
    echo "   ❌ 백엔드 컨테이너가 실행 중이 아닙니다"
fi

echo ""
echo "=========================================="

