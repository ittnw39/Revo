"""
RevoProject 백엔드 서버
오디오 녹음, STT, 감정 분석, 키워드 추출 기능 제공
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
import whisper
from dotenv import load_dotenv

from models import db, User, Recording, EmotionType
from services import analyze_text_with_gpt, extract_keywords_simple

# 환경변수 로드
load_dotenv()

app = Flask(__name__)
CORS(app)

# 데이터베이스 설정
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///revo.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# 파일 업로드 설정
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'm4a', 'ogg', 'webm'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Whisper 모델 로드
print("Whisper 모델 로딩 중...")
whisper_model = whisper.load_model("base")
print("Whisper 모델 로드 완료!")

# 데이터베이스 초기화
with app.app_context():
    db.create_all()
    print("데이터베이스 초기화 완료!")

def allowed_file(filename):
    """허용된 파일 확장자 확인"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ==================== API 엔드포인트 ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({
        'status': 'ok',
        'message': '서버가 정상적으로 실행 중입니다.',
        'timestamp': datetime.now().isoformat()
    })

# ==================== 사용자 API ====================

@app.route('/api/users', methods=['POST'])
def create_user():
    """
    사용자 생성 또는 조회
    Body: { "name": "사용자이름" }
    """
    try:
        data = request.get_json()
        name = data.get('name')
        
        if not name:
            return jsonify({'error': '이름을 입력해주세요.'}), 400
        
        # 기존 사용자 확인
        user = User.query.filter_by(name=name).first()
        
        if user:
            return jsonify({
                'success': True,
                'message': '기존 사용자를 찾았습니다.',
                'user': user.to_dict()
            }), 200
        
        # 새 사용자 생성
        user = User(name=name)
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '새 사용자가 생성되었습니다.',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """특정 사용자 조회"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        return jsonify({
            'success': True,
            'user': user.to_dict()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users', methods=['GET'])
def get_all_users():
    """모든 사용자 조회"""
    try:
        users = User.query.all()
        return jsonify({
            'success': True,
            'users': [user.to_dict() for user in users]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== 녹음 API ====================

@app.route('/api/recordings', methods=['POST'])
def create_recording():
    """
    녹음 파일 업로드 및 처리
    FormData:
    - audio: 오디오 파일
    - user_id: 사용자 ID
    - highlight_time: 하이라이트 구간 (선택, 예: "1:30")
    """
    try:
        # 파일 확인
        if 'audio' not in request.files:
            return jsonify({'error': '오디오 파일이 없습니다.'}), 400
        
        file = request.files['audio']
        user_id = request.form.get('user_id')
        highlight_time = request.form.get('highlight_time')
        
        if not user_id:
            return jsonify({'error': '사용자 ID가 필요합니다.'}), 400
        
        # 사용자 확인
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        if file.filename == '':
            return jsonify({'error': '파일이 선택되지 않았습니다.'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': '허용되지 않은 파일 형식입니다.'}), 400
        
        # 파일 저장
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(filepath)
        
        # 파일 크기 확인
        file_size = os.path.getsize(filepath)
        if file_size > MAX_FILE_SIZE:
            os.remove(filepath)
            return jsonify({'error': '파일 크기가 너무 큽니다. (최대 50MB)'}), 400
        
        print(f"파일 업로드 완료: {unique_filename}")
        
        # STT 처리
        print("STT 처리 중...")
        result = whisper_model.transcribe(filepath, language='ko')
        transcript = result['text'].strip()
        print(f"STT 완료: {transcript[:100]}...")
        
        # ChatGPT로 키워드 및 감정 분석
        print("GPT 분석 중...")
        analysis = analyze_text_with_gpt(transcript)
        
        # 키워드가 없으면 간단한 키워드 추출 사용
        if not analysis['keywords']:
            analysis['keywords'] = extract_keywords_simple(transcript)
        
        keywords_str = ','.join(analysis['keywords'])
        emotion = analysis['emotion']
        
        print(f"분석 완료 - 키워드: {keywords_str}, 감정: {emotion.value}")
        
        # DB에 녹음 기록 저장
        recording = Recording(
            user_id=user_id,
            content=transcript,
            keywords=keywords_str,
            audio_file=unique_filename,
            emotion=emotion,
            highlight_time=highlight_time,
            recorded_at=datetime.utcnow()
        )
        
        db.session.add(recording)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '녹음이 저장되었습니다.',
            'recording': recording.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"오류 발생: {str(e)}")
        # 실패 시 업로드된 파일 삭제
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({
            'error': '처리 중 오류가 발생했습니다.',
            'message': str(e)
        }), 500

@app.route('/api/recordings', methods=['GET'])
def get_all_recordings():
    """
    모든 녹음 조회 (피드)
    Query params:
    - user_id: 특정 사용자만 조회 (선택)
    - limit: 개수 제한 (기본 50)
    """
    try:
        user_id = request.args.get('user_id', type=int)
        limit = request.args.get('limit', default=50, type=int)
        
        query = Recording.query
        
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        recordings = query.order_by(Recording.recorded_at.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'count': len(recordings),
            'recordings': [rec.to_dict() for rec in recordings]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/recordings/<int:recording_id>', methods=['GET'])
def get_recording(recording_id):
    """특정 녹음 조회"""
    try:
        recording = Recording.query.get(recording_id)
        if not recording:
            return jsonify({'error': '녹음을 찾을 수 없습니다.'}), 404
        
        return jsonify({
            'success': True,
            'recording': recording.to_dict()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/recordings/<int:recording_id>', methods=['DELETE'])
def delete_recording(recording_id):
    """녹음 삭제"""
    try:
        recording = Recording.query.get(recording_id)
        if not recording:
            return jsonify({'error': '녹음을 찾을 수 없습니다.'}), 404
        
        # 파일 삭제
        filepath = os.path.join(UPLOAD_FOLDER, recording.audio_file)
        if os.path.exists(filepath):
            os.remove(filepath)
        
        # DB에서 삭제
        db.session.delete(recording)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '녹음이 삭제되었습니다.'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/recordings/<int:recording_id>/like', methods=['POST'])
def like_recording(recording_id):
    """좋아요 추가"""
    try:
        recording = Recording.query.get(recording_id)
        if not recording:
            return jsonify({'error': '녹음을 찾을 수 없습니다.'}), 404
        
        recording.likes += 1
        db.session.commit()
        
        return jsonify({
            'success': True,
            'likes': recording.likes
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/recordings/<int:recording_id>/unlike', methods=['POST'])
def unlike_recording(recording_id):
    """좋아요 취소"""
    try:
        recording = Recording.query.get(recording_id)
        if not recording:
            return jsonify({'error': '녹음을 찾을 수 없습니다.'}), 404
        
        if recording.likes > 0:
            recording.likes -= 1
            db.session.commit()
        
        return jsonify({
            'success': True,
            'likes': recording.likes
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ==================== 오디오 파일 API ====================

@app.route('/api/audio/<filename>', methods=['GET'])
def get_audio(filename):
    """오디오 파일 다운로드/재생"""
    try:
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(filepath):
            return jsonify({'error': '파일을 찾을 수 없습니다.'}), 404
        
        return send_file(filepath)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== 감정 통계 API ====================

@app.route('/api/emotions/stats', methods=['GET'])
def get_emotion_stats():
    """감정별 통계"""
    try:
        user_id = request.args.get('user_id', type=int)
        
        query = Recording.query
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        recordings = query.all()
        
        # 감정별 카운트
        emotion_counts = {}
        for emotion_type in EmotionType:
            count = sum(1 for rec in recordings if rec.emotion == emotion_type)
            emotion_counts[emotion_type.value] = count
        
        return jsonify({
            'success': True,
            'total': len(recordings),
            'emotions': emotion_counts
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # 개발 서버 실행
    app.run(host='0.0.0.0', port=5000, debug=True)
