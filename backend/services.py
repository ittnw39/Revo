"""
외부 서비스 통합 (ChatGPT API)
"""
import os
from dotenv import load_dotenv
from openai import OpenAI
from models import EmotionType

# .env 파일 로드
load_dotenv()

# OpenAI 클라이언트 (API 키가 있을 때만 생성)
_client = None

def get_client():
    """OpenAI 클라이언트 지연 초기화"""
    global _client
    if _client is None:
        api_key = os.getenv('OPENAI_API_KEY')
        if api_key:
            _client = OpenAI(api_key=api_key)
        else:
            _client = None
    return _client

def analyze_text_with_gpt(text):
    """
    ChatGPT API를 사용하여 텍스트 분석
    - 키워드 추출
    - 감정 분석
    
    Returns:
        dict: {
            'keywords': ['키워드1', '키워드2', ...],
            'emotion': EmotionType
        }
    """
    client = get_client()
    
    # API 키가 없으면 간단한 방식 사용
    if client is None:
        print("OpenAI API 키가 없습니다. 간단한 키워드 추출 방식을 사용합니다.")
        keywords = extract_keywords_simple(text)
        return {
            'keywords': keywords,
            'emotion': EmotionType.SURPRISE
        }
    
    try:
        # 감정 매핑
        emotion_map = {
            "기쁨": EmotionType.JOY,
            "화남": EmotionType.ANGER,
            "슬픔": EmotionType.SADNESS,
            "당황": EmotionType.CONFUSION,
            "놀람": EmotionType.SURPRISE,
            "신남": EmotionType.EXCITEMENT
        }
        
        prompt = f"""
다음 텍스트를 분석해주세요:

"{text}"

1. 이 텍스트에서 가장 중요한 키워드 5개를 추출해주세요.
2. 이 텍스트의 전체적인 감정을 다음 중 하나로 분류해주세요: 기쁨, 화남, 슬픔, 당황, 놀람, 신남

반드시 다음 JSON 형식으로만 답변해주세요:
{{
    "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
    "emotion": "감정"
}}
"""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "당신은 텍스트 분석 전문가입니다. JSON 형식으로만 답변합니다."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=200
        )
        
        # 응답 파싱
        result_text = response.choices[0].message.content.strip()
        
        # JSON 파싱
        import json
        result = json.loads(result_text)
        
        # 감정 변환
        emotion_str = result.get('emotion', '놀람')
        emotion = emotion_map.get(emotion_str, EmotionType.SURPRISE)
        
        return {
            'keywords': result.get('keywords', []),
            'emotion': emotion
        }
        
    except Exception as e:
        print(f"GPT API 오류: {str(e)}")
        # 기본값 반환
        keywords = extract_keywords_simple(text)
        return {
            'keywords': keywords,
            'emotion': EmotionType.SURPRISE
        }

def extract_keywords_simple(text):
    """
    간단한 키워드 추출 (GPT API가 없을 때 사용)
    """
    import re
    from collections import Counter
    
    # 한국어 불용어
    stop_words = {'이', '가', '을', '를', '은', '는', '의', '와', '과', '도', '로', '으로', 
                  '에서', '에게', '께', '한', '한다', '하다', '되는', '되다', '있다', '없다',
                  '그', '그것', '이것', '저것', '그런', '이런', '저런', '그렇게', '이렇게',
                  '잘', '좀', '더', '매우', '너무', '정말', '진짜', '그냥', '아주'}
    
    # 단어 추출
    words = re.findall(r'[가-힣]{2,}', text)
    filtered_words = [word for word in words if word not in stop_words]
    
    # 빈도수 기반 키워드 추출
    word_counts = Counter(filtered_words)
    keywords = [word for word, count in word_counts.most_common(5)]
    
    return keywords

