#!/bin/bash
# AWS 볼륨 확장 후 파일 시스템 확장 스크립트
# 사용법: ./expand_disk.sh

echo "=========================================="
echo "💾 디스크 확장"
echo "=========================================="

echo ""
echo "1️⃣ 현재 디스크 사용량 확인:"
df -h

echo ""
echo "2️⃣ 디스크 장치 확인:"
lsblk

echo ""
echo "3️⃣ 루트 파일 시스템 장치 확인:"
ROOT_DEVICE=$(df / | tail -1 | awk '{print $1}')
echo "   루트 파일 시스템: $ROOT_DEVICE"

# 실제 블록 장치 찾기
if [[ "$ROOT_DEVICE" == /dev/nvme* ]]; then
    # NVMe 장치
    BASE_DEVICE=$(echo "$ROOT_DEVICE" | sed 's/p[0-9]*$//')
    PARTITION_NUM=$(echo "$ROOT_DEVICE" | grep -o 'p[0-9]*$' | sed 's/p//')
    if [ -z "$PARTITION_NUM" ]; then
        PARTITION_NUM=1
    fi
elif [[ "$ROOT_DEVICE" == /dev/xvda* ]] || [[ "$ROOT_DEVICE" == /dev/sda* ]]; then
    # xvda 또는 sda 장치
    BASE_DEVICE=$(echo "$ROOT_DEVICE" | sed 's/[0-9]*$//')
    PARTITION_NUM=$(echo "$ROOT_DEVICE" | grep -o '[0-9]*$')
    if [ -z "$PARTITION_NUM" ]; then
        PARTITION_NUM=1
    fi
else
    # /dev/root 같은 경우 실제 장치 찾기
    BASE_DEVICE=$(lsblk -n -o PKNAME $(df / | tail -1 | awk '{print $1}') | head -1)
    if [ -z "$BASE_DEVICE" ]; then
        # 대체 방법: lsblk에서 루트 파티션 찾기
        BASE_DEVICE=$(lsblk -n -o NAME,MOUNTPOINT | grep '/$' | awk '{print $1}' | sed 's/[0-9]*$//' | head -1)
    fi
    PARTITION_NUM=1
fi

# /dev/ 접두사 추가
if [[ ! "$BASE_DEVICE" == /dev/* ]]; then
    BASE_DEVICE="/dev/$BASE_DEVICE"
fi

echo ""
echo "   감지된 기본 장치: $BASE_DEVICE"
echo "   파티션 번호: $PARTITION_NUM"

if [ ! -b "$BASE_DEVICE" ]; then
    echo ""
    echo "❌ 오류: 장치 $BASE_DEVICE를 찾을 수 없습니다!"
    echo ""
    echo "수동으로 확인 후 실행하세요:"
    echo "   lsblk"
    echo "   sudo growpart <장치명> <파티션번호>"
    echo "   sudo resize2fs <파티션장치명>"
    exit 1
fi

echo ""
echo "3️⃣ 파일 시스템 확장 중..."

# 파티션 확장
echo "   파티션 확장 중: $BASE_DEVICE $PARTITION_NUM"
if sudo growpart "$BASE_DEVICE" "$PARTITION_NUM"; then
    echo "   ✅ 파티션 확장 성공"
else
    echo "   ⚠️  파티션 확장 실패 (이미 확장되었을 수 있음)"
fi

# 파일 시스템 확장
if [[ "$ROOT_DEVICE" == /dev/nvme* ]]; then
    FS_DEVICE="${BASE_DEVICE}p${PARTITION_NUM}"
elif [[ "$ROOT_DEVICE" == /dev/xvda* ]] || [[ "$ROOT_DEVICE" == /dev/sda* ]]; then
    FS_DEVICE="${BASE_DEVICE}${PARTITION_NUM}"
else
    # /dev/root인 경우 실제 장치 찾기
    FS_DEVICE=$(lsblk -n -o NAME,MOUNTPOINT | grep ' /$' | awk '{print $1}' | head -1)
    if [[ ! "$FS_DEVICE" == /dev/* ]]; then
        FS_DEVICE="/dev/$FS_DEVICE"
    fi
    # lsblk 출력에서 특수문자 제거
    FS_DEVICE=$(echo "$FS_DEVICE" | sed 's/[├─└│]//g' | tr -d ' ')
fi

# 최종 확인: /dev/xvda1 형식으로 정리
if [[ "$BASE_DEVICE" == /dev/xvda ]] && [[ "$PARTITION_NUM" == 1 ]]; then
    FS_DEVICE="/dev/xvda1"
elif [[ "$BASE_DEVICE" == /dev/nvme0n1 ]] && [[ "$PARTITION_NUM" == 1 ]]; then
    FS_DEVICE="/dev/nvme0n1p1"
elif [[ "$BASE_DEVICE" == /dev/sda ]] && [[ "$PARTITION_NUM" == 1 ]]; then
    FS_DEVICE="/dev/sda1"
fi

echo "   파일 시스템 확장 중: $FS_DEVICE"
if sudo resize2fs "$FS_DEVICE"; then
    echo "   ✅ 파일 시스템 확장 성공"
else
    echo "   ⚠️  파일 시스템 확장 실패"
fi

echo ""
echo "4️⃣ 확장 후 디스크 사용량:"
df -h

echo ""
echo "=========================================="
echo "✅ 디스크 확장 완료!"
echo "=========================================="

