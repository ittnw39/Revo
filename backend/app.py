"""
RevoProject 백엔드 서버
오디오 파일 업로드, STT 처리, 키워드 추출 기능 제공
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
import whisper
import re
from collections import Counter
import json

app = Flask(__name__)
CORS(app)  # CORS 설정으로 프론트엔드와 통신 가능

# 설정
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'm4a', 'ogg', 'webm'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# 업로드 폴더 생성
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Whisper 모델 로드 (초기 로딩으로 인한 지연 방지)
print("Whisper 모델 로딩 중...")
model = whisper.load_model("base")
print("Whisper 모델 로드 완료!")

def allowed_file(filename):
    """허용된 파일 확장자 확인"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_keywords(text, topic_keywords=None):
    """
    텍스트에서 키워드 추출
    특정 주제에 맞는 단어만 추출 (주제 키워드 리스트가 제공되면 필터링)
    """
    # 한국어 불용어 제거 (기본적인 것들)
    stop_words = {'이', '가', '을', '를', '은', '는', '의', '와', '과', '도', '로', '으로', 
                  '에서', '에게', '께', '한', '한다', '하다', '되는', '되다', '있다', '없다',
                  '그', '그것', '이것', '저것', '그런', '이런', '저런', '그렇게', '이렇게',
                  '잘', '좀', '더', '매우', '너무', '정말', '진짜', '그냥', '아주'}
    
    # 문장 부호 및 특수문자 제거
    text = re.sub(r'[^\w\s가-힣]', ' ', text)
    
    # 단어 추출 (한글 단어, 2글자 이상)
    words = re.findall(r'[가-힣]{2,}', text)
    
    # 불용어 제거 및 필터링
    filtered_words = [word for word in words if word not in stop_words and len(word) >= 2]
    
    # 주제 키워드가 제공되면 필터링
    if topic_keywords:
        topic_set = set(topic_keywords)
        filtered_words = [word for word in filtered_words if word in topic_set]
    
    # 빈도수 기반으로 키워드 추출 (상위 10개)
    word_counts = Counter(filtered_words)
    top_keywords = [word for word, count in word_counts.most_common(10)]
    
    return top_keywords

@app.route('/api/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({
        'status': 'ok',
        'message': '서버가 정상적으로 실행 중입니다.',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/upload-audio', methods=['POST'])
def upload_audio():
    """
    오디오 파일 업로드 및 처리
    1. 파일 업로드
    2. STT (Speech-to-Text) 변환
    3. 키워드 추출
    4. 결과 반환
    """
    try:
        # 파일 확인
        if 'audio' not in request.files:
            return jsonify({'error': '오디오 파일이 없습니다.'}), 400
        
        file = request.files['audio']
        
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
        
        print(f"파일 업로드 완료: {unique_filename} ({file_size} bytes)")
        
        # STT 처리
        print("STT 처리 중...")
        result = model.transcribe(filepath, language='ko')
        transcript = result['text'].strip()
        
        print(f"STT 완료: {transcript[:100]}...")
        
        # 키워드 추출 (주제 키워드는 선택적, request에서 받을 수 있음)
        topic_keywords = request.form.get('topic_keywords')
        if topic_keywords:
            topic_keywords = json.loads(topic_keywords)
        
        keywords = extract_keywords(transcript, topic_keywords)
        
        print(f"키워드 추출 완료: {keywords}")
        
        # 응답 데이터 구성
        response_data = {
            'success': True,
            'file_id': unique_filename,
            'transcript': transcript,
            'keywords': keywords,
            'duration': result.get('duration', 0),
            'language': result.get('language', 'ko'),
            'timestamp': datetime.now().isoformat()
        }
        
        # 임시 파일 삭제 (선택사항 - 나중에 필요하면 보관)
        # os.remove(filepath)
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"오류 발생: {str(e)}")
        return jsonify({
            'error': '처리 중 오류가 발생했습니다.',
            'message': str(e)
        }), 500

@app.route('/api/audio/<file_id>', methods=['DELETE'])
def delete_audio(file_id):
    """업로드된 오디오 파일 삭제"""
    try:
        filepath = os.path.join(UPLOAD_FOLDER, file_id)
        if os.path.exists(filepath):
            os.remove(filepath)
            return jsonify({'success': True, 'message': '파일이 삭제되었습니다.'}), 200
        else:
            return jsonify({'error': '파일을 찾을 수 없습니다.'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # 개발 서버 실행
    app.run(host='0.0.0.0', port=5000, debug=True)

