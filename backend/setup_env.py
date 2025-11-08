"""
환경변수 설정 도우미 스크립트
.env 파일을 생성하고 필요한 환경변수를 입력받습니다.
"""

def setup_env():
    print("=" * 50)
    print("RevoProject 백엔드 환경설정")
    print("=" * 50)
    print()
    
    # OpenAI API 키 입력
    print("OpenAI API 키가 필요합니다.")
    print("발급 방법: https://platform.openai.com/api-keys")
    print()
    
    api_key = input("OpenAI API 키를 입력하세요 (없으면 Enter): ").strip()
    
    # .env 파일 생성
    with open('.env', 'w', encoding='utf-8') as f:
        if api_key:
            f.write(f"OPENAI_API_KEY={api_key}\n")
        else:
            f.write("# OPENAI_API_KEY=your_key_here\n")
            print("\n⚠️  API 키가 설정되지 않았습니다.")
            print("   키워드 추출이 간단한 방식으로 작동합니다.")
    
    print()
    print("✅ .env 파일이 생성되었습니다!")
    print()
    print("다음 단계:")
    print("1. pip install -r requirements.txt")
    print("2. python app.py")
    print()

if __name__ == "__main__":
    setup_env()

