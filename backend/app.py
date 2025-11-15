"""
RevoProject 백엔드 서버
오디오 녹음, STT, 감정 분석, 키워드 추출 기능 제공
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import uuid
from datetime import datetime, timezone, timedelta
from werkzeug.utils import secure_filename
import whisper
from dotenv import load_dotenv

from models import db, User, Recording, EmotionType, get_kst_now
from services import analyze_text_with_gpt, extract_keywords_simple

# 환경변수 로드
load_dotenv()

app = Flask(__name__)

# CORS 설정 - 프로덕션 환경변수에서 허용할 도메인 가져오기
allowed_origins = os.getenv('ALLOWED_ORIGINS', '*').split(',')
if allowed_origins == ['*']:
    # 개발 환경: 모든 도메인 허용
    CORS(app)
else:
    # 프로덕션 환경: 특정 도메인만 허용
    CORS(app, origins=allowed_origins)

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
        'timestamp': get_kst_now().isoformat()
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
        user = db.session.get(User, user_id)
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
        user_id_str = request.form.get('user_id')
        highlight_time = request.form.get('highlight_time')
        frontend_transcript = request.form.get('transcript', '').strip()  # 프론트엔드에서 인식한 텍스트
        district = request.form.get('district', '').strip()  # 위치 정보 (동/구)
        
        if not user_id_str:
            return jsonify({'error': '사용자 ID가 필요합니다.'}), 400
        
        # user_id를 정수로 변환
        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError):
            return jsonify({'error': '사용자 ID가 올바르지 않습니다.'}), 400
        
        # 사용자 확인
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        if file.filename == '':
            return jsonify({'error': '파일이 선택되지 않았습니다.'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': '허용되지 않은 파일 형식입니다.'}), 400
        
        # 파일 저장
        filename = secure_filename(file.filename)
        if not filename:
            # 파일명이 없으면 확장자만 사용
            file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'webm'
            filename = f"recording.{file_ext}"
        
        unique_filename = f"{uuid.uuid4()}_{filename}"
        
        # 업로드 폴더 절대 경로
        upload_dir = os.path.abspath(UPLOAD_FOLDER)
        os.makedirs(upload_dir, exist_ok=True)
        
        filepath = os.path.join(upload_dir, unique_filename)
        
        print(f"파일 저장 시작: {filename}")
        print(f"저장 경로: {filepath}")
        print(f"업로드 폴더 존재: {os.path.exists(upload_dir)}")
        
        try:
            file.save(filepath)
        except Exception as save_error:
            print(f"파일 저장 오류: {str(save_error)}")
            return jsonify({'error': f'파일 저장 실패: {str(save_error)}'}), 500
        
        # 파일 저장 확인
        if not os.path.exists(filepath):
            print(f"파일이 저장되지 않았습니다: {filepath}")
            return jsonify({'error': '파일 저장에 실패했습니다.'}), 500
        
        # 파일 크기 확인
        try:
            file_size = os.path.getsize(filepath)
        except Exception as size_error:
            print(f"파일 크기 확인 오류: {str(size_error)}")
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'error': f'파일 크기 확인 실패: {str(size_error)}'}), 500
        
        if file_size > MAX_FILE_SIZE:
            os.remove(filepath)
            return jsonify({'error': '파일 크기가 너무 큽니다. (최대 50MB)'}), 400
        
        if file_size == 0:
            os.remove(filepath)
            return jsonify({'error': '빈 파일입니다.'}), 400
        
        print(f"파일 업로드 완료: {unique_filename}")
        print(f"파일 경로: {filepath}")
        print(f"파일 크기: {file_size} bytes")
        print(f"파일 존재 확인: {os.path.exists(filepath)}")
        
        # STT 처리
        # 프론트엔드에서 인식한 텍스트가 있으면 우선 사용, 없으면 Whisper 사용
        if frontend_transcript:
            print("=" * 50)
            print("프론트엔드에서 인식한 텍스트 사용")
            print(f"프론트엔드 텍스트: {frontend_transcript}")
            print("=" * 50)
            transcript = frontend_transcript
        else:
            print("STT 처리 중... (Whisper 사용)")
            print(f"Whisper에 전달할 파일 경로: {filepath}")
            print(f"파일 절대 경로: {os.path.abspath(filepath)}")
            
            # 파일 존재 재확인
            if not os.path.exists(filepath):
                print(f"ERROR: 파일이 존재하지 않습니다: {filepath}")
                return jsonify({'error': '파일을 찾을 수 없습니다.'}), 500
            
            try:
                # ffmpeg 확인 (Windows에서 필요)
                import subprocess
                try:
                    subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True, timeout=5)
                    print("ffmpeg 확인 완료")
                except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
                    print("경고: ffmpeg가 설치되어 있지 않거나 PATH에 없습니다.")
                    print("webm 파일 처리를 위해 ffmpeg가 필요할 수 있습니다.")
                
                result = whisper_model.transcribe(filepath, language='ko')
            except FileNotFoundError as e:
                print(f"Whisper 파일 찾기 오류: {str(e)}")
                print(f"시도한 경로: {filepath}")
                print(f"파일 존재 여부: {os.path.exists(filepath)}")
                if os.path.exists(filepath):
                    print(f"파일은 존재하지만 Whisper가 찾지 못함 - ffmpeg 설치 필요할 수 있음")
                return jsonify({'error': f'오디오 파일 처리 실패: {str(e)}. ffmpeg 설치가 필요할 수 있습니다.'}), 500
            except Exception as whisper_error:
                print(f"Whisper 처리 오류: {str(whisper_error)}")
                import traceback
                error_trace = traceback.format_exc()
                print(error_trace)
                return jsonify({'error': f'STT 처리 실패: {str(whisper_error)}'}), 500
            transcript = result['text'].strip()
            print(f"Whisper STT 완료: {transcript}")
        
        print(f"최종 사용 텍스트: {transcript}")
        print(f"텍스트 길이: {len(transcript)}")
        
        # ChatGPT로 키워드 및 감정 분석
        print("=" * 50)
        print("GPT 분석 시작...")
        print(f"분석할 텍스트: {transcript}")
        print("=" * 50)
        analysis = analyze_text_with_gpt(transcript)
        print("=" * 50)
        print(f"GPT 분석 완료 - 키워드: {analysis['keywords']}, 감정: {analysis['emotion'].value}")
        print("=" * 50)
        
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
            district=district if district else None,
            recorded_at=get_kst_now()
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
        import traceback
        error_trace = traceback.format_exc()
        print(f"오류 발생: {str(e)}")
        print(f"상세 오류:\n{error_trace}")
        # 실패 시 업로드된 파일 삭제
        if 'filepath' in locals() and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass
        return jsonify({
            'error': '처리 중 오류가 발생했습니다.',
            'message': str(e),
            'trace': error_trace if app.debug else None
        }), 500

@app.route('/api/recordings', methods=['GET'])
def get_all_recordings():
    """
    모든 녹음 조회 (피드)
    Query params:
    - user_id: 특정 사용자만 조회 (선택)
    - limit: 개수 제한 (기본 50)
    - is_uploaded: 업로드된 기록만 조회 (선택, true/false)
    """
    try:
        user_id = request.args.get('user_id', type=int)
        limit = request.args.get('limit', default=50, type=int)
        is_uploaded = request.args.get('is_uploaded', type=str)
        
        query = Recording.query
        
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        # 업로드 여부 필터
        if is_uploaded is not None:
            is_uploaded_bool = is_uploaded.lower() == 'true'
            query = query.filter_by(is_uploaded=is_uploaded_bool)
        
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
        recording = db.session.get(Recording, recording_id)
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
        recording = db.session.get(Recording, recording_id)
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
        recording = db.session.get(Recording, recording_id)
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
        recording = db.session.get(Recording, recording_id)
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

@app.route('/api/recordings/<int:recording_id>', methods=['PATCH'])
def update_recording(recording_id):
    """녹음 정보 업데이트 (하이라이트 시간 등)"""
    try:
        recording = db.session.get(Recording, recording_id)
        if not recording:
            return jsonify({'error': '녹음을 찾을 수 없습니다.'}), 404
        
        data = request.get_json()
        
        # 하이라이트 시간 업데이트
        if 'highlight_time' in data:
            recording.highlight_time = data['highlight_time']
        
        # 업로드 여부 업데이트
        if 'is_uploaded' in data:
            recording.is_uploaded = data['is_uploaded']
            # 업로드 여부가 True로 설정되면 업로드 날짜도 설정
            if data['is_uploaded']:
                recording.uploaded_at = get_kst_now()
            # 업로드 여부가 False로 설정되면 업로드 날짜는 null로 유지 (기존 값 유지)
        
        recording.updated_at = get_kst_now()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '녹음 정보가 업데이트되었습니다.',
            'recording': recording.to_dict()
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
    # 서버 시작 시 API 키 확인
    from services import get_client
    print("=" * 50)
    print("서버 시작 중...")
    client = get_client()
    if client:
        print("✅ OpenAI API 클라이언트 준비 완료!")
    else:
        print("⚠️  OpenAI API 키가 없습니다. 기본 키워드 추출 방식을 사용합니다.")
    print("=" * 50)
    
    # 개발 서버 실행
    app.run(host='0.0.0.0', port=5000, debug=True)
