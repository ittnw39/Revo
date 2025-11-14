"""
데이터베이스에 district 컬럼 추가 스크립트
"""
import sqlite3
import os

# 데이터베이스 경로
db_path = os.path.join(os.path.dirname(__file__), 'instance', 'revo.db')

if not os.path.exists(db_path):
    print(f"데이터베이스 파일을 찾을 수 없습니다: {db_path}")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 기존 컬럼 확인
    cursor.execute("PRAGMA table_info(recordings)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'district' in columns:
        print("district 컬럼이 이미 존재합니다.")
    else:
        # district 컬럼 추가
        cursor.execute("ALTER TABLE recordings ADD COLUMN district VARCHAR(50)")
        conn.commit()
        print("district 컬럼이 성공적으로 추가되었습니다.")
    
    conn.close()
    print("마이그레이션 완료!")
    
except Exception as e:
    print(f"오류 발생: {e}")
    if conn:
        conn.close()

