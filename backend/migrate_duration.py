"""
오디오 duration 마이그레이션 스크립트
1. duration 컬럼 추가 (없는 경우)
2. 기존 녹음들의 duration 계산 및 업데이트 (선택)
"""
import sqlite3
import os
from pathlib import Path

# pydub는 선택적으로 import (duration 계산할 때만 필요)
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    print("⚠️  pydub를 사용할 수 없습니다. duration 컬럼 추가만 수행합니다.")
    print("   duration 계산을 원하면: pip install pydub pyaudioop")

UPLOAD_FOLDER = 'uploads'

def migrate_duration_column():
    """duration 컬럼 추가"""
    # 데이터베이스 파일 경로 확인
    db_paths = [
        Path('instance/revo.db'),
        Path('revo.db'),
        Path('backend/revo.db'),
        Path('backend/instance/revo.db')
    ]
    
    db_path = None
    for path in db_paths:
        if path.exists():
            db_path = path
            break
    
    if not db_path:
        print("❌ 데이터베이스 파일을 찾을 수 없습니다.")
        print("다음 경로를 확인했습니다:")
        for path in db_paths:
            print(f"  - {path}")
        return False
    
    print(f"📁 데이터베이스 파일: {db_path}")
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # recordings 테이블의 컬럼 확인
        cursor.execute("PRAGMA table_info(recordings)")
        columns = [row[1] for row in cursor.fetchall()]
        
        print(f"현재 컬럼: {columns}")
        
        # duration 컬럼 추가
        if 'duration' not in columns:
            print("➕ duration 컬럼 추가 중...")
            cursor.execute("ALTER TABLE recordings ADD COLUMN duration REAL")
            conn.commit()
            print("✅ duration 컬럼 추가 완료!")
        else:
            print("✅ duration 컬럼 이미 존재")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ 마이그레이션 오류: {e}")
        return False
    finally:
        conn.close()

def update_existing_durations():
    """기존 녹음들의 duration 계산 및 업데이트"""
    if not PYDUB_AVAILABLE:
        print("❌ pydub를 사용할 수 없어 duration 계산을 수행할 수 없습니다.")
        print("   다음 명령어로 설치하세요:")
        print("   pip install pydub pyaudioop")
        print("   또는 가상환경 사용: venv\\Scripts\\python.exe migrate_duration.py --update-existing")
        return False
    
    # 데이터베이스 파일 경로 확인
    db_paths = [
        Path('instance/revo.db'),
        Path('revo.db'),
        Path('backend/revo.db'),
        Path('backend/instance/revo.db')
    ]
    
    db_path = None
    for path in db_paths:
        if path.exists():
            db_path = path
            break
    
    if not db_path:
        print("❌ 데이터베이스 파일을 찾을 수 없습니다.")
        return False
    
    print(f"\n📁 기존 녹음들의 duration 계산 시작...")
    print(f"데이터베이스: {db_path}")
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # duration이 null이거나 0인 녹음들 가져오기
        cursor.execute("""
            SELECT id, audio_file 
            FROM recordings 
            WHERE duration IS NULL OR duration = 0
        """)
        recordings = cursor.fetchall()
        
        if not recordings:
            print("✅ 업데이트할 녹음이 없습니다.")
            return True
        
        print(f"📊 총 {len(recordings)}개의 녹음 발견")
        
        # 업로드 폴더 경로 확인
        upload_paths = [
            Path(UPLOAD_FOLDER),
            Path('backend') / UPLOAD_FOLDER,
            Path('instance') / UPLOAD_FOLDER,
        ]
        
        upload_folder = None
        for path in upload_paths:
            if path.exists():
                upload_folder = path
                break
        
        if not upload_folder:
            print(f"❌ 업로드 폴더를 찾을 수 없습니다. ({UPLOAD_FOLDER})")
            return False
        
        print(f"📁 업로드 폴더: {upload_folder}")
        
        success_count = 0
        error_count = 0
        
        for idx, (recording_id, audio_file) in enumerate(recordings, 1):
            filepath = upload_folder / audio_file
            
            if not filepath.exists():
                print(f"⚠️  [{idx}/{len(recordings)}] 파일 없음: {audio_file} (ID: {recording_id})")
                error_count += 1
                continue
            
            try:
                # 오디오 duration 계산
                audio = AudioSegment.from_file(str(filepath))
                duration = len(audio) / 1000.0  # Convert ms to seconds
                
                # DB 업데이트
                cursor.execute("""
                    UPDATE recordings 
                    SET duration = ? 
                    WHERE id = ?
                """, (duration, recording_id))
                
                print(f"✅ [{idx}/{len(recordings)}] ID {recording_id}: {duration:.2f}초 ({audio_file})")
                success_count += 1
                
            except Exception as e:
                print(f"❌ [{idx}/{len(recordings)}] ID {recording_id} 오류: {str(e)}")
                error_count += 1
                continue
        
        conn.commit()
        
        print(f"\n📊 완료!")
        print(f"  ✅ 성공: {success_count}개")
        print(f"  ❌ 실패: {error_count}개")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ 오류: {e}")
        return False
    finally:
        conn.close()

if __name__ == '__main__':
    import sys
    
    print("=" * 60)
    print("오디오 Duration 마이그레이션 스크립트")
    print("=" * 60)
    
    # 1. duration 컬럼 추가
    if not migrate_duration_column():
        print("\n❌ 컬럼 추가 실패. 스크립트를 종료합니다.")
        sys.exit(1)
    
    # 2. 기존 녹음들의 duration 업데이트 (선택)
    if len(sys.argv) > 1 and sys.argv[1] == '--update-existing':
        print("\n" + "=" * 60)
        update_existing_durations()
    else:
        print("\n💡 기존 녹음들의 duration을 업데이트하려면:")
        print("   python migrate_duration.py --update-existing")
    
    print("\n✅ 마이그레이션 완료!")

