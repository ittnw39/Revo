"""
데이터베이스 마이그레이션 스크립트
기존 데이터베이스에 새로운 컬럼 추가
"""
import sqlite3
import os
from pathlib import Path

def migrate_database():
    """데이터베이스 마이그레이션 실행"""
    # 데이터베이스 파일 경로
    db_path = Path('instance/revo.db')
    
    if not db_path.exists():
        print("데이터베이스 파일이 없습니다. 앱을 실행하면 자동으로 생성됩니다.")
        return
    
    print(f"데이터베이스 마이그레이션 시작: {db_path}")
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # recordings 테이블의 컬럼 확인
        cursor.execute("PRAGMA table_info(recordings)")
        columns = [row[1] for row in cursor.fetchall()]
        
        print(f"현재 컬럼: {columns}")
        
        # is_uploaded 컬럼 추가
        if 'is_uploaded' not in columns:
            print("is_uploaded 컬럼 추가 중...")
            cursor.execute("ALTER TABLE recordings ADD COLUMN is_uploaded BOOLEAN DEFAULT 0 NOT NULL")
            print("✓ is_uploaded 컬럼 추가 완료")
        else:
            print("✓ is_uploaded 컬럼 이미 존재")
        
        # uploaded_at 컬럼 추가
        if 'uploaded_at' not in columns:
            print("uploaded_at 컬럼 추가 중...")
            cursor.execute("ALTER TABLE recordings ADD COLUMN uploaded_at DATETIME")
            print("✓ uploaded_at 컬럼 추가 완료")
        else:
            print("✓ uploaded_at 컬럼 이미 존재")
        
        # district 컬럼 추가
        if 'district' not in columns:
            print("district 컬럼 추가 중...")
            cursor.execute("ALTER TABLE recordings ADD COLUMN district VARCHAR(50)")
            print("✓ district 컬럼 추가 완료")
        else:
            print("✓ district 컬럼 이미 존재")
        
        conn.commit()
        print("\n✅ 데이터베이스 마이그레이션 완료!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ 마이그레이션 오류: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database()
