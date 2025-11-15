#!/bin/bash
# EC2 서버에서 환경 변수 설정 수정 스크립트
# 사용법: bash fix_env_on_ec2.sh

echo "=========================================="
echo "🔧 EC2 환경 변수 설정 수정"
echo "=========================================="

cd ~/Revo/backend || exit 1

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
        
        # 중복된 OPENAI_API_KEY= 제거
        if [[ "$KEY_VALUE" == OPENAI_API_KEY* ]]; then
            echo "   ⚠️  문제 발견: 중복된 'OPENAI_API_KEY=' 감지"
            echo "   수정 중..."
            # 실제 키만 추출 (OPENAI_API_KEY= 이후 부분)
            ACTUAL_KEY=$(echo "$KEY_VALUE" | sed 's/^OPENAI_API_KEY=//')
            # .env 파일에서 해당 줄 수정
            sed -i "s/^OPENAI_API_KEY=.*/OPENAI_API_KEY=$ACTUAL_KEY/" .env
            echo "   ✅ 수정 완료"
            KEY_VALUE="$ACTUAL_KEY"
        fi
        
        echo "   키 값 분석:"
        echo "   - 길이: ${#KEY_VALUE}자"
        echo "   - 앞 10자: ${KEY_VALUE:0:10}..."
        
        # 검증
        if [[ ! "$KEY_VALUE" == sk-* ]]; then
            echo ""
            echo "   ❌ 오류: API 키가 'sk-'로 시작하지 않습니다!"
            echo "   올바른 OpenAI API 키를 입력해주세요."
            exit 1
        fi
    else
        echo "   ❌ OPENAI_API_KEY가 설정되어 있지 않습니다."
        echo ""
        echo "   .env 파일에 API 키를 추가하세요:"
        echo "   nano .env"
        echo ""
        echo "   다음 줄을 추가:"
        echo "   OPENAI_API_KEY=sk-your-actual-api-key-here"
        exit 1
    fi
else
    echo "   ❌ .env 파일이 없습니다."
    echo ""
    echo "   .env 파일 생성:"
    read -p "   OpenAI API 키를 입력하세요: " API_KEY
    echo "OPENAI_API_KEY=$API_KEY" > .env
    echo "   ✅ .env 파일 생성 완료"
fi

echo ""
echo "2️⃣ .env 파일 내용 확인:"
cat .env | grep -v "^#" | grep -v "^$" | head -5

echo ""
echo "3️⃣ Docker 컨테이너 재시작:"
echo "   컨테이너 중지 중..."
docker-compose down

echo ""
echo "   컨테이너 시작 중..."
docker-compose up -d

echo ""
echo "4️⃣ 컨테이너 내부 환경변수 확인:"
sleep 3
CONTAINER_ID=$(docker-compose ps -q backend 2>/dev/null)
if [ -n "$CONTAINER_ID" ]; then
    echo "   컨테이너 내부 OPENAI_API_KEY:"
    docker exec $CONTAINER_ID env | grep OPENAI_API_KEY | head -1 | sed 's/\(.\{50\}\).*/\1.../' || echo "   ❌ OPENAI_API_KEY 환경변수 없음"
else
    echo "   ❌ 백엔드 컨테이너가 실행 중이 아닙니다"
fi

echo ""
echo "=========================================="
echo "✅ 완료!"
echo ""
echo "📝 다음 단계:"
echo "   1. 로그 확인: docker-compose logs -f backend"
echo "   2. API 테스트: curl http://localhost:5000/api/health"
echo "=========================================="

