#!/bin/bash
# 빠른 배포 스크립트 (재빌드 없이 재시작만)
# 사용법: ./quick_deploy.sh

set -e

echo "=========================================="
echo "⚡ 빠른 배포 (재시작만)"
echo "=========================================="

cd "$( dirname "${BASH_SOURCE[0]}" )"

# Git Pull
echo "📥 Git Pull 중..."
git pull origin main

# 컨테이너 재시작
echo "🔄 컨테이너 재시작 중..."
docker-compose restart

echo "✅ 완료!"
echo ""
echo "📋 로그 확인: docker-compose logs -f"

