"""
.env 파일 확인 및 생성 스크립트
"""
import os
from pathlib import Path

def check_env_file():
    """환경변수 파일 확인"""
    env_path = Path(__file__).parent / '.env'
    
    if env_path.exists():
        print(f"✅ .env 파일이 존재합니다: {env_path}")
        with open(env_path, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'OPENAI_API_KEY' in content:
                # 키 값의 일부만 표시 (보안)
                lines = content.split('\n')
                for line in lines:
                    if 'OPENAI_API_KEY' in line and not line.strip().startswith('#'):
                        key_value = line.split('=', 1)[1] if '=' in line else ''
                        if key_value.strip():
                            print(f"✅ OPENAI_API_KEY가 설정되어 있습니다. (길이: {len(key_value.strip())})")
                        else:
                            print("❌ OPENAI_API_KEY가 비어있습니다.")
                        break
                else:
                    print("❌ OPENAI_API_KEY가 주석 처리되어 있습니다.")
            else:
                print("❌ OPENAI_API_KEY가 .env 파일에 없습니다.")
    else:
        print(f"❌ .env 파일이 없습니다: {env_path}")
        print("다음 명령어로 생성하세요:")
        print("python setup_env.py")

if __name__ == '__main__':
    check_env_file()

