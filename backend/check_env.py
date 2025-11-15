"""
.env 파일 확인 및 생성 스크립트
"""
import os
from pathlib import Path
from dotenv import load_dotenv

def check_env_file():
    """환경변수 파일 확인"""
    env_path = Path(__file__).parent / '.env'
    
    print("=" * 60)
    print("🔍 환경변수 파일 확인 중...")
    print("=" * 60)
    
    if env_path.exists():
        print(f"✅ .env 파일이 존재합니다: {env_path.absolute()}")
        
        # .env 파일 로드
        load_dotenv(dotenv_path=env_path)
        
        # API 키 확인
        api_key = os.getenv('OPENAI_API_KEY')
        
        if api_key:
            print(f"✅ OPENAI_API_KEY가 설정되어 있습니다.")
            print(f"   키 길이: {len(api_key)} 글자")
            print(f"   키 앞 10자: {api_key[:10]}...")
            print(f"   키 앞 4자: {api_key[:4]}...")
            
            # API 키 형식 확인 (sk-로 시작하는지)
            if api_key.startswith('sk-'):
                print("✅ API 키 형식이 올바릅니다 (sk-로 시작)")
            else:
                print("⚠️ API 키 형식이 일반적이지 않습니다 (sk-로 시작하지 않음)")
            
            # 실제 클라이언트 생성 테스트
            try:
                from services import get_client
                client = get_client()
                if client:
                    print("✅ OpenAI 클라이언트 생성 성공!")
                else:
                    print("❌ OpenAI 클라이언트 생성 실패!")
            except Exception as e:
                print(f"❌ 클라이언트 생성 중 오류: {e}")
        else:
            print("❌ OPENAI_API_KEY가 설정되어 있지 않습니다.")
            print("   .env 파일에 다음을 추가하세요:")
            print("   OPENAI_API_KEY=your_api_key_here")
            
            # .env 파일 내용 확인
            with open(env_path, 'r', encoding='utf-8') as f:
                content = f.read()
                if 'OPENAI_API_KEY' in content:
                    print("\n⚠️ .env 파일에 OPENAI_API_KEY가 있지만 로드되지 않았습니다.")
                    print("   다음을 확인하세요:")
                    print("   1. 주석 처리되어 있지 않은지 (# 제거)")
                    print("   2. 따옴표로 감싸져 있지 않은지")
                    print("   3. 공백이 없는지")
    else:
        print(f"❌ .env 파일이 없습니다: {env_path.absolute()}")
        print("\n다음 명령어로 생성하세요:")
        print("   python setup_env.py")
    
    print("=" * 60)

if __name__ == '__main__':
    check_env_file()

