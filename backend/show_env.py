"""
.env 파일 내용 확인 스크립트
"""
from pathlib import Path

env_path = Path(__file__).parent / '.env'

if env_path.exists():
    print(f"✅ .env 파일 존재: {env_path}")
    print("\n=== .env 파일 내용 ===")
    with open(env_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f, 1):
            # API 키는 일부만 표시
            if 'OPENAI_API_KEY' in line:
                parts = line.split('=', 1)
                if len(parts) == 2:
                    key_name = parts[0]
                    key_value = parts[1].strip()
                    if key_value:
                        print(f"{i}: {key_name}={key_value[:20]}...{key_value[-10:]} (전체 길이: {len(key_value)})")
                    else:
                        print(f"{i}: {key_name}= (비어있음)")
                else:
                    print(f"{i}: {line.rstrip()}")
            else:
                print(f"{i}: {line.rstrip()}")
    print("=" * 50)
else:
    print(f"❌ .env 파일이 없습니다: {env_path}")

