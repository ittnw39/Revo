"""
실시간 로그 확인 스크립트
Git Bash에서 사용: python watch_logs.py
"""
import sys
import time
from pathlib import Path

def watch_logs(log_file='server.log', lines=50):
    """로그 파일을 실시간으로 확인"""
    log_path = Path(__file__).parent / log_file
    
    print("=" * 60)
    print("📋 실시간 로그 확인")
    print("=" * 60)
    print(f"로그 파일: {log_path.absolute()}")
    print(f"마지막 {lines}줄 표시")
    print("=" * 60)
    print("종료하려면 Ctrl+C를 누르세요")
    print("=" * 60)
    print()
    
    if not log_path.exists():
        print(f"⚠️ 로그 파일이 없습니다: {log_path}")
        print("서버를 다음 명령어로 실행하세요:")
        print("   python app.py > server.log 2>&1")
        return
    
    try:
        # 파일 크기 추적
        last_size = log_path.stat().st_size
        
        # 처음 마지막 N줄 표시
        with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
            all_lines = f.readlines()
            for line in all_lines[-lines:]:
                print(line.rstrip())
        
        # 실시간 모니터링
        while True:
            current_size = log_path.stat().st_size
            
            if current_size > last_size:
                # 새 내용 읽기
                with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
                    f.seek(last_size)
                    new_content = f.read()
                    if new_content:
                        print(new_content.rstrip())
                
                last_size = current_size
            
            time.sleep(0.5)  # 0.5초마다 확인
            
    except KeyboardInterrupt:
        print("\n\n로그 확인을 종료합니다.")
    except Exception as e:
        print(f"\n오류 발생: {e}")

if __name__ == '__main__':
    log_file = sys.argv[1] if len(sys.argv) > 1 else 'server.log'
    watch_logs(log_file)

