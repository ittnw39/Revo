"""
데이터베이스 스키마 확인 스크립트
"""
import sqlite3
import os

def check_database():
    """데이터베이스 컬럼 확인"""
    db_path = os.path.join('instance', 'revo.db')
    
    if not os.path.exists(db_path):
        print("[오류] 데이터베이스 파일이 없습니다.")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 기존 컬럼 확인
        cursor.execute("PRAGMA table_info(recordings)")
        columns = cursor.fetchall()
        
        print("\n[recordings 테이블 컬럼 목록]")
        print("-" * 60)
        for col in columns:
            print(f"  {col[1]:20} {col[2]:15} (nullable: {not col[3]})")
        print("-" * 60)
        
        column_names = [col[1] for col in columns]
        
        # 필요한 컬럼 확인
        has_is_uploaded = 'is_uploaded' in column_names
        has_uploaded_at = 'uploaded_at' in column_names
        
        print(f"\n[is_uploaded 컬럼]: {'존재함' if has_is_uploaded else '없음'}")
        print(f"[uploaded_at 컬럼]: {'존재함' if has_uploaded_at else '없음'}")
        
        if has_is_uploaded and has_uploaded_at:
            print("\n[결과] 데이터베이스 스키마가 정상입니다!")
        else:
            print("\n[경고] 마이그레이션이 필요합니다.")
            print("   서버를 종료한 후 migrate_db.py를 실행하세요.")
        
        conn.close()
        
    except Exception as e:
        print(f"[오류] {str(e)}")

if __name__ == '__main__':
    check_database()

