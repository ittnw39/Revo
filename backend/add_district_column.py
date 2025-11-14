"""
district 컬럼 추가 스크립트
"""
import sqlite3
from pathlib import Path

db_path = Path('instance/revo.db')

if not db_path.exists():
    print("데이터베이스 파일이 없습니다.")
    exit(1)

print(f"데이터베이스 파일: {db_path}")

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

try:
    # 현재 컬럼 확인
    cursor.execute("PRAGMA table_info(recordings)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"현재 컬럼: {columns}")
    
    # district 컬럼 확인 및 추가
    if 'district' not in columns:
        print("district 컬럼 추가 중...")
        cursor.execute("ALTER TABLE recordings ADD COLUMN district VARCHAR(50)")
        conn.commit()
        print("✅ district 컬럼 추가 완료!")
    else:
        print("✓ district 컬럼이 이미 존재합니다")
    
    # 최종 확인
    cursor.execute("PRAGMA table_info(recordings)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"최종 컬럼: {columns}")
    
except Exception as e:
    conn.rollback()
    print(f"❌ 오류: {e}")
    raise
finally:
    conn.close()
