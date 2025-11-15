#!/bin/bash
# 자동 배포 스크립트 (프로덕션용)
# 사용법: ./deploy.sh

set -e  # 오류 발생 시 중단

echo "=========================================="
echo "🚀 Revo 백엔드 자동 배포 시작"
echo "=========================================="

# 현재 디렉토리 확인
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ""
echo "📂 현재 디렉토리: $(pwd)"
echo ""

# 1. Git 변경사항 확인
echo "1️⃣ Git 상태 확인 중..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  로컬에 커밋되지 않은 변경사항이 있습니다."
    read -p "계속하시겠습니까? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 배포 취소됨"
        exit 1
    fi
fi

# 2. Git Pull
echo ""
echo "2️⃣ Git Pull 실행 중..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ Git Pull 실패"
    exit 1
fi
echo "✅ Git Pull 완료"

# 3. Docker Compose로 컨테이너 중지 및 제거
echo ""
echo "3️⃣ 기존 컨테이너 중지 중..."
docker-compose down
echo "✅ 컨테이너 중지 완료"

# 4. Docker 이미지 재빌드 (캐시 없이)
echo ""
echo "4️⃣ Docker 이미지 재빌드 중..."
docker-compose build --no-cache
if [ $? -ne 0 ]; then
    echo "❌ Docker 빌드 실패"
    exit 1
fi
echo "✅ Docker 빌드 완료"

# 5. 컨테이너 시작
echo ""
echo "5️⃣ 컨테이너 시작 중..."
docker-compose up -d
if [ $? -ne 0 ]; then
    echo "❌ 컨테이너 시작 실패"
    exit 1
fi
echo "✅ 컨테이너 시작 완료"

# 6. 컨테이너 상태 확인
echo ""
echo "6️⃣ 컨테이너 상태 확인 중..."
sleep 3
docker-compose ps

# 7. 로그 확인
echo ""
echo "=========================================="
echo "📋 최근 로그 (마지막 20줄)"
echo "=========================================="
docker-compose logs --tail=20

echo ""
echo "=========================================="
echo "✅ 배포 완료!"
echo "=========================================="
echo ""
echo "📌 유용한 명령어:"
echo "   로그 확인: docker-compose logs -f"
echo "   상태 확인: docker-compose ps"
echo "   컨테이너 중지: docker-compose down"
echo "   컨테이너 재시작: docker-compose restart"
echo ""

