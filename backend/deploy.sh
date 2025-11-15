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

# 0. 디스크 공간 확인 및 강력한 정리
echo "0️⃣ 디스크 공간 확인 및 정리 중..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
echo "   현재 디스크 사용량: ${DISK_USAGE}%"

# 항상 Docker 정리 실행 (용량 확보)
echo "   🗑️  Docker 정리 중..."
docker container prune -f 2>/dev/null || true
docker image prune -a -f 2>/dev/null || true
docker volume prune -f 2>/dev/null || true
docker network prune -f 2>/dev/null || true
docker builder prune -a -f 2>/dev/null || true

# 시스템 캐시 정리
echo "   🗑️  시스템 캐시 정리 중..."
sudo apt-get clean 2>/dev/null || true
sudo apt-get autoclean 2>/dev/null || true
sudo apt-get autoremove -y 2>/dev/null || true

# 임시 파일 정리
echo "   🗑️  임시 파일 정리 중..."
sudo rm -rf /tmp/* 2>/dev/null || true
sudo rm -rf /var/tmp/* 2>/dev/null || true

# 정리 후 사용량 재확인
DISK_USAGE_AFTER=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
echo "✅ 디스크 정리 완료 (정리 후: ${DISK_USAGE_AFTER}%)"

if [ "$DISK_USAGE_AFTER" -gt 90 ]; then
    echo "⚠️  경고: 디스크 사용량이 여전히 ${DISK_USAGE_AFTER}%입니다!"
    echo "💡 AWS 콘솔에서 볼륨 크기를 늘리는 것을 권장합니다."
fi

# 1. Git 강제 Pull (로컬 변경사항 무시)
echo ""
echo "1️⃣ Git 강제 Pull 실행 중..."
git fetch origin main
git reset --hard origin/main
if [ $? -ne 0 ]; then
    echo "❌ Git Pull 실패"
    exit 1
fi
echo "✅ Git Pull 완료 (로컬 변경사항 무시하고 원격 저장소 상태로 강제 업데이트)"

# 2. Docker Compose로 컨테이너 중지 및 제거
echo ""
echo "2️⃣ 기존 컨테이너 중지 중..."
docker-compose down
echo "✅ 컨테이너 중지 완료"

# 3. Docker 이미지 재빌드 (캐시 없이)
echo ""
echo "3️⃣ Docker 이미지 재빌드 중..."
docker-compose build --no-cache
if [ $? -ne 0 ]; then
    echo "❌ Docker 빌드 실패"
    echo ""
    echo "💡 디스크 공간 부족일 수 있습니다. 다음 명령어로 수동 정리:"
    echo "   docker system prune -a -f"
    echo "   sudo apt-get clean && sudo apt-get autoremove -y"
    exit 1
fi
echo "✅ Docker 빌드 완료"

# 4. 컨테이너 시작
echo ""
echo "4️⃣ 컨테이너 시작 중..."
docker-compose up -d
if [ $? -ne 0 ]; then
    echo "❌ 컨테이너 시작 실패"
    exit 1
fi
echo "✅ 컨테이너 시작 완료"

# 5. 컨테이너 상태 확인
echo ""
echo "5️⃣ 컨테이너 상태 확인 중..."
sleep 3
docker-compose ps

# 6. API 키 확인
echo ""
echo "6️⃣ API 키 확인 중..."
if [ -f .env ] && grep -q "OPENAI_API_KEY" .env; then
    echo "✅ .env 파일에 OPENAI_API_KEY 설정됨"
else
    echo "⚠️  .env 파일에 OPENAI_API_KEY가 없습니다!"
    echo "   프로덕션에서 감정 분석이 작동하지 않을 수 있습니다."
fi

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
echo "   API 키 확인: ./check_api_key.sh"
echo "   컨테이너 중지: docker-compose down"
echo "   컨테이너 재시작: docker-compose restart"
echo ""

