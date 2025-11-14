"""
데이터베이스 마이그레이션 스크립트
is_uploaded, uploaded_at 컬럼 추가
"""
import sqlite3
import os

def migrate_database():
    """데이터베이스에 새 컬럼 추가"""
    db_path = os.path.join('instance', 'revo.db')
    
    if not os.path.exists(db_path):
        print("데이터베이스 파일이 없습니다. app.py를 실행하면 자동으로 생성됩니다.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 기존 컬럼 확인
        cursor.execute("PRAGMA table_info(recordings)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # is_uploaded 컬럼 추가
        if 'is_uploaded' not in columns:
            print("is_uploaded 컬럼 추가 중...")
            cursor.execute("ALTER TABLE recordings ADD COLUMN is_uploaded BOOLEAN DEFAULT 0")
            print("[완료] is_uploaded 컬럼 추가 완료")
        else:
            print("[확인] is_uploaded 컬럼이 이미 존재합니다")
        
        # uploaded_at 컬럼 추가
        if 'uploaded_at' not in columns:
            print("uploaded_at 컬럼 추가 중...")
            cursor.execute("ALTER TABLE recordings ADD COLUMN uploaded_at DATETIME")
            print("[완료] uploaded_at 컬럼 추가 완료")
        else:
            print("[확인] uploaded_at 컬럼이 이미 존재합니다")
        
        conn.commit()
        print("\n[결과] 데이터베이스 마이그레이션 완료!")
        
    except Exception as e:
        conn.rollback()
        print(f"[오류] {str(e)}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database()

