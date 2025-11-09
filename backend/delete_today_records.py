"""
오늘 날짜의 기록을 삭제하는 스크립트
사용법: python delete_today_records.py [사용자이름]
"""
import sys
from datetime import datetime, date
from app import app, db
from models import User, Recording

def delete_today_records(user_name=None):
    """오늘 날짜의 기록 삭제"""
    with app.app_context():
        # 사용자 이름이 제공된 경우 해당 사용자만, 아니면 모든 사용자
        if user_name:
            user = User.query.filter_by(name=user_name).first()
            if not user:
                print(f"사용자 '{user_name}'를 찾을 수 없습니다.")
                return
            
            # 오늘 날짜의 기록 조회
            today = date.today()
            recordings = Recording.query.filter(
                Recording.user_id == user.id,
                db.func.date(Recording.recorded_at) == today
            ).all()
            
            count = len(recordings)
            if count == 0:
                print(f"사용자 '{user_name}'의 오늘 날짜({today}) 기록이 없습니다.")
                return
            
            # 삭제
            for recording in recordings:
                db.session.delete(recording)
            
            db.session.commit()
            print(f"사용자 '{user_name}'의 오늘 날짜({today}) 기록 {count}개를 삭제했습니다.")
        else:
            # 모든 사용자의 오늘 날짜 기록 삭제
            today = date.today()
            recordings = Recording.query.filter(
                db.func.date(Recording.recorded_at) == today
            ).all()
            
            count = len(recordings)
            if count == 0:
                print(f"오늘 날짜({today}) 기록이 없습니다.")
                return
            
            # 삭제
            for recording in recordings:
                db.session.delete(recording)
            
            db.session.commit()
            print(f"모든 사용자의 오늘 날짜({today}) 기록 {count}개를 삭제했습니다.")

if __name__ == '__main__':
    user_name = sys.argv[1] if len(sys.argv) > 1 else None
    
    if user_name:
        print(f"사용자 '{user_name}'의 오늘 날짜 기록을 삭제합니다...")
    else:
        print("모든 사용자의 오늘 날짜 기록을 삭제합니다...")
    
    delete_today_records(user_name)

