"""
데이터베이스 모델 정의
"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import enum

db = SQLAlchemy()

class EmotionType(enum.Enum):
    """감정 타입 enum"""
    JOY = "기쁨"
    ANGER = "화남"
    SADNESS = "슬픔"
    CONFUSION = "당황"
    SURPRISE = "놀람"
    EXCITEMENT = "신남"

class User(db.Model):
    """사용자 모델"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 관계: 사용자 -> 녹음들 (일대다)
    recordings = db.relationship('Recording', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat(),
            'recording_count': len(self.recordings)
        }

class Recording(db.Model):
    """녹음 기록 모델"""
    __tablename__ = 'recordings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # 녹음 정보
    content = db.Column(db.Text, nullable=False)  # STT로 변환된 텍스트 내용
    keywords = db.Column(db.String(500), nullable=True)  # 쉼표로 구분된 키워드들
    audio_file = db.Column(db.String(255), nullable=False)  # 녹음 파일명
    recorded_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # 감정 (일대일)
    emotion = db.Column(db.Enum(EmotionType), nullable=False)
    
    # 하이라이트 구간 (예: "1:30" 형식으로 저장)
    highlight_time = db.Column(db.String(20), nullable=True)
    
    # 좋아요 수
    likes = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name,
            'content': self.content,
            'keywords': self.keywords.split(',') if self.keywords else [],
            'audio_file': self.audio_file,
            'audio_url': f'/api/audio/{self.audio_file}',
            'recorded_at': self.recorded_at.isoformat(),
            'emotion': self.emotion.value if self.emotion else None,
            'highlight_time': self.highlight_time,
            'likes': self.likes,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

