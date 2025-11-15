#!/bin/bash
# 스크립트 실행 권한 부여
# 사용법: bash fix_permissions.sh

chmod +x deploy.sh
chmod +x expand_disk.sh
chmod +x check_api_key.sh
chmod +x quick_deploy.sh

echo "✅ 모든 스크립트에 실행 권한 부여 완료!"
echo ""
echo "이제 다음 명령어를 사용할 수 있습니다:"
echo "   ./deploy.sh"
echo "   ./expand_disk.sh"
echo "   ./check_api_key.sh"
echo "   ./quick_deploy.sh"

