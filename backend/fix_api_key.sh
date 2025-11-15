#!/bin/bash
# API 키 확인 및 수정 가이드 스크립트
# 사용법: bash fix_api_key.sh

echo "=========================================="
echo "🔍 API 키 확인 및 수정 가이드"
echo "=========================================="

echo ""
echo "1️⃣ .env 파일 확인:"
if [ -f .env ]; then
    echo "   ✅ .env 파일 존재"
    echo ""
    echo "   현재 OPENAI_API_KEY 설정:"
    if grep -q "OPENAI_API_KEY" .env; then
        KEY_LINE=$(grep "^OPENAI_API_KEY" .env | head -1)
        echo "   $KEY_LINE"
        echo ""
        
        # 키 값 추출
        KEY_VALUE=$(echo "$KEY_LINE" | cut -d'=' -f2- | tr -d ' ' | tr -d '"' | tr -d "'")
        
        echo "   키 값 분석:"
        echo "   - 길이: ${#KEY_VALUE}자"
        echo "   - 앞 10자: ${KEY_VALUE:0:10}..."
        
        # 검증
        if [[ "$KEY_VALUE" == OPENAI_API_KEY* ]] || [[ "$KEY_VALUE" == OPENAI_A* ]]; then
            echo ""
            echo "   ❌ 문제 발견: API 키가 잘못 저장되어 있습니다!"
            echo "   현재 값: $KEY_VALUE"
            echo ""
            echo "   💡 해결 방법:"
            echo "   1. .env 파일을 열어서 수정하세요:"
            echo "      nano .env"
            echo ""
            echo "   2. 다음 형식으로 수정하세요:"
            echo "      OPENAI_API_KEY=sk-your-actual-api-key-here"
            echo ""
            echo "   3. 주의사항:"
            echo "      - 'OPENAI_API_KEY=' 다음에 바로 실제 키만 입력"
            echo "      - 따옴표 없이 입력"
            echo "      - 공백 없이 입력"
            echo "      - 'sk-'로 시작해야 함"
        elif [[ ! "$KEY_VALUE" == sk-* ]]; then
            echo ""
            echo "   ⚠️  경고: API 키가 'sk-'로 시작하지 않습니다!"
            echo "   올바른 OpenAI API 키는 'sk-'로 시작해야 합니다."
        elif [ ${#KEY_VALUE} -lt 40 ] || [ ${#KEY_VALUE} -gt 60 ]; then
            echo ""
            echo "   ⚠️  경고: API 키 길이가 비정상입니다!"
            echo "   정상적인 OpenAI API 키는 40-60자입니다."
        else
            echo ""
            echo "   ✅ API 키 형식이 올바릅니다!"
        fi
    else
        echo "   ❌ OPENAI_API_KEY가 설정되어 있지 않습니다."
    fi
else
    echo "   ❌ .env 파일이 없습니다."
    echo ""
    echo "   .env 파일 생성:"
    echo "   echo 'OPENAI_API_KEY=sk-your-api-key-here' > .env"
fi

echo ""
echo "=========================================="
echo "2️⃣ Docker 컨테이너 내부 확인:"
CONTAINER_ID=$(docker-compose ps -q backend 2>/dev/null)
if [ -n "$CONTAINER_ID" ]; then
    echo "   컨테이너 ID: $CONTAINER_ID"
    echo ""
    echo "   컨테이너 내부 환경변수:"
    docker exec $CONTAINER_ID env | grep OPENAI_API_KEY | head -1 | sed 's/\(.\{50\}\).*/\1.../' || echo "   ❌ OPENAI_API_KEY 환경변수 없음"
else
    echo "   ❌ 백엔드 컨테이너가 실행 중이 아닙니다"
fi

echo ""
echo "=========================================="
echo "💡 수정 후:"
echo "   1. .env 파일 수정"
echo "   2. 컨테이너 완전히 재시작:"
echo "      docker-compose down"
echo "      docker-compose up -d"
echo "   3. 또는 전체 재배포:"
echo "      bash deploy.sh"
echo ""
echo "⚠️  중요: docker-compose restart만으로는 환경변수가 갱신되지 않을 수 있습니다!"
echo "   반드시 down 후 up을 실행하세요."
echo "=========================================="

