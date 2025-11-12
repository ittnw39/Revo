"""
외부 서비스 통합 (ChatGPT API)
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from models import EmotionType

# .env 파일 로드 (명시적으로 backend 폴더 경로 지정)
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)
print(f"[GPT 분석] .env 파일 경로: {env_path}")
print(f"[GPT 분석] .env 파일 존재: {env_path.exists()}")

# OpenAI 클라이언트 (API 키가 있을 때만 생성)
_client = None

def get_client():
    """OpenAI 클라이언트 지연 초기화"""
    global _client
    if _client is None:
        # 환경변수 직접 확인
        api_key = os.getenv('OPENAI_API_KEY')
        
        # .env 파일에서 직접 읽기 시도
        if not api_key:
            env_path = Path(__file__).parent / '.env'
            if env_path.exists():
                print(f"[GPT 분석] .env 파일에서 직접 읽기 시도...")
                print(f"[GPT 분석] 파일 경로: {env_path.absolute()}")
                try:
                    with open(env_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        print(f"[GPT 분석] 파일 줄 수: {len(lines)}")
                        for i, line in enumerate(lines, 1):
                            original_line = line
                            line = line.strip()
                            print(f"[GPT 분석] 줄 {i}: '{line[:50]}...' (전체 길이: {len(original_line)})")
                            # 주석이나 빈 줄 건너뛰기
                            if not line or line.startswith('#'):
                                continue
                            # OPENAI_API_KEY=로 시작하는 줄 찾기
                            if 'OPENAI_API_KEY' in line:
                                if '=' in line:
                                    api_key = line.split('=', 1)[1].strip()
                                    # 따옴표 제거
                                    if api_key.startswith('"') and api_key.endswith('"'):
                                        api_key = api_key[1:-1]
                                    elif api_key.startswith("'") and api_key.endswith("'"):
                                        api_key = api_key[1:-1]
                                    # 주석 제거
                                    if '#' in api_key:
                                        api_key = api_key.split('#')[0].strip()
                                    print(f"[GPT 분석] .env 파일에서 API 키 읽기 성공! (길이: {len(api_key)})")
                                    print(f"[GPT 분석] API 키 앞 10자: {api_key[:10]}...")
                                    break
                                else:
                                    print(f"[GPT 분석] 줄 {i}에 '=' 기호가 없습니다.")
                except Exception as e:
                    print(f"[GPT 분석] .env 파일 읽기 오류: {e}")
                    import traceback
                    print(traceback.format_exc())
        
        print(f"[GPT 분석] API 키 확인 중... (키 존재: {bool(api_key)}, 길이: {len(api_key) if api_key else 0})")
        if api_key:
            _client = OpenAI(api_key=api_key)
            print("[GPT 분석] OpenAI 클라이언트 생성 완료!")
        else:
            print("[GPT 분석] OpenAI API 키가 없습니다!")
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
        print("[GPT 분석] OpenAI API 키가 없습니다. 간단한 키워드 추출 방식을 사용합니다.")
        keywords = extract_keywords_simple(text)
        return {
            'keywords': keywords,
            'emotion': EmotionType.SURPRISE
        }
    
    print(f"[GPT 분석] API 클라이언트 확인 완료. 감정 분석만 시작...")
    print(f"[GPT 분석] 입력 텍스트: {text}")
    print(f"[GPT 분석] 참고: 키워드는 ChatGPT가 아닌 로컬에서 문장의 단어를 추출합니다.")
    
    try:
        # 감정 매핑 (행복, 놀람, 화남, 슬픔, 신남, 보통)
        emotion_map = {
            "행복": EmotionType.JOY,
            "화남": EmotionType.ANGER,
            "슬픔": EmotionType.SADNESS,
            "보통": EmotionType.CONFUSION,
            "놀람": EmotionType.SURPRISE,
            "신남": EmotionType.EXCITEMENT
        }
        
        prompt = f"""다음 텍스트를 분석해주세요:

"{text}"

1. 감정 분석: 행복, 놀람, 화남, 슬픔, 신남, 보통 중 하나를 선택
   - 맛있다, 좋다, 즐겁다, 행복하다, 기쁘다 -> 행복
   - 놀랍다, 깜짝, 신기하다 -> 놀람
   - 화나다, 짜증나다, 화났다 -> 화남
   - 슬프다, 우울하다, 힘들다 -> 슬픔
   - 신나다, 설레다, 두근거린다 -> 신남
   - 특별한 감정이 없거나 중립적 -> 보통

2. 키워드 추출: 장소와 기분에 영향을 주는 구체적인 명사만 추출
   - 장소: 성북동, 공원, 카페, 학교 등
   - 기분에 영향을 주는 구체적인 대상: 아기고양이, 친구, 돈까스, 음식 등
   - 조사 제거: "성북동에" -> "성북동", "아기고양이를" -> "아기고양이"
   
   절대 추출하지 말 것:
   - 시간 관련 단어: 오늘, 어제, 내일, 지금, 그때 등
   - 동사, 형용사, 동사구: 먹고 싶다, 가고 싶다, 좋다, 나쁘다 등
   - 일반적인 단어: 길, 정말, 매우, 너무 등
   - 추상적인 단어: 기분, 감정, 생각 등
   
   반드시 명사만 추출하고, 문장에서 실제로 언급된 구체적인 대상이나 장소만 추출하세요.

예시:
텍스트: "오늘 성북동에 갔는데 길을 가다가 아기고양이를 봤다 정말 귀여웠고 기분이 좋아졌다"
결과: {{"emotion": "행복", "keywords": ["성북동", "아기고양이"]}}

텍스트: "돈까스 먹어서 맛있다"
결과: {{"emotion": "행복", "keywords": ["돈까스"]}}

텍스트: "내일 돈까스 먹고 싶다"
결과: {{"emotion": "행복", "keywords": ["돈까스"]}}

JSON 형식:
{{
    "emotion": "행복",
    "keywords": ["성북동", "아기고양이"]
}}
"""
        
        print(f"[GPT 분석] 텍스트: {text}")
        print(f"[GPT 분석] 텍스트 길이: {len(text)}")
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "텍스트 감정 분석 및 키워드 추출 전문가. JSON 형식으로만 답변."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=200  # 키워드도 포함하므로 토큰 수 증가
        )
        
        # 응답 파싱
        result_text = response.choices[0].message.content.strip()
        print(f"[GPT 분석] 원본 응답: {result_text}")
        
        # 코드 블록 제거 (```json ... ``` 형식)
        if result_text.startswith('```'):
            # 첫 번째 ``` 이후부터 마지막 ``` 이전까지 추출
            lines = result_text.split('\n')
            json_lines = []
            in_json = False
            for line in lines:
                if line.strip().startswith('```'):
                    in_json = not in_json
                    continue
                if in_json:
                    json_lines.append(line)
            result_text = '\n'.join(json_lines)
        
        # JSON 파싱
        import json
        try:
            result = json.loads(result_text)
            print(f"[GPT 분석] 파싱된 결과: {result}")
        except json.JSONDecodeError as e:
            print(f"[GPT 분석] JSON 파싱 오류: {e}")
            print(f"[GPT 분석] 파싱 시도한 텍스트: {result_text}")
            # 기본값 반환
            keywords = extract_keywords_simple(text)
            return {
                'keywords': keywords,
                'emotion': EmotionType.SURPRISE
            }
        
        # 감정 변환
        emotion_str = result.get('emotion', '').strip()
        print(f"[GPT 분석] 추출된 감정 문자열: '{emotion_str}'")
        
        # 감정 매핑 (대소문자 무시)
        emotion_str_lower = emotion_str.lower()
        emotion = None
        for key, value in emotion_map.items():
            if key.lower() == emotion_str_lower:
                emotion = value
                break
        
        # 매핑 실패 시 기본값
        if emotion is None:
            print(f"[GPT 분석] 감정 매핑 실패: '{emotion_str}' -> 기본값(놀람) 사용")
            emotion = EmotionType.SURPRISE
        else:
            print(f"[GPT 분석] 감정 매핑 성공: '{emotion_str}' -> {emotion.value}")
        
        # 키워드 추출 (ChatGPT에서 추출 시도, 없으면 로컬 추출)
        keywords = result.get('keywords', [])
        if not keywords or len(keywords) == 0:
            print(f"[GPT 분석] ChatGPT에서 키워드 추출 실패. 로컬 키워드 추출 시작...")
            keywords = extract_keywords_simple(text)
        else:
            print(f"[GPT 분석] ChatGPT에서 키워드 추출 성공: {keywords}")
        
        print(f"[GPT 분석] 최종 결과 - 키워드: {keywords}, 감정: {emotion.value}")
        
        return {
            'keywords': keywords,
            'emotion': emotion
        }
        
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        
        print(f"[GPT 분석] API 오류 발생: {error_type}")
        print(f"[GPT 분석] 오류 메시지: {error_msg}")
        import traceback
        print(f"[GPT 분석] 상세 오류:\n{traceback.format_exc()}")
        
        # API 오류 시 기본값 반환 (키워드는 단어 추출, 감정은 놀람)
        print("[GPT 분석] ⚠️ OpenAI API 오류로 인해 감정은 기본값(놀람)을 사용합니다.")
        print("[GPT 분석] 키워드는 로컬에서 문장의 단어를 추출합니다 (ChatGPT 사용 안 함).")
        keywords = extract_keywords_simple(text)
        
        return {
            'keywords': keywords,
            'emotion': EmotionType.SURPRISE
        }

def extract_keywords_simple(text):
    """
    문장에서 키워드 추출 (로컬 처리, ChatGPT 사용 안 함)
    한국어 명사를 추출하고 조사 및 불용어를 제거합니다.
    """
    import re
    from collections import Counter
    
    # 한국어 조사 패턴 (단어 끝에 붙는 조사)
    josa_patterns = [
        r'은$', r'는$', r'이$', r'가$', r'을$', r'를$', r'의$', r'와$', r'과$', 
        r'도$', r'로$', r'으로$', r'에서$', r'에게$', r'께$', r'한테$', r'에게서$',
        r'만$', r'까지$', r'부터$', r'처럼$', r'같이$', r'보다$', r'마다$'
    ]
    
    # 한국어 불용어 (조사, 대명사, 부사 등)
    stop_words = {'이', '가', '을', '를', '은', '는', '의', '와', '과', '도', '로', '으로', 
                  '에서', '에게', '께', '한', '한다', '하다', '되는', '되다', '있다', '없다',
                  '그', '그것', '이것', '저것', '그런', '이런', '저런', '그렇게', '이렇게',
                  '잘', '좀', '더', '매우', '너무', '정말', '진짜', '그냥', '아주',
                  '오늘', '어제', '내일', '지금', '그때', '이때', '저때',  # 시간 관련 불용어
                  '나갔다', '왔다', '갔다', '했다', '했다', '했다', '했다',  # 동사 불용어
                  '좋다', '나쁘다', '크다', '작다', '많다', '적다'}  # 형용사 불용어
    
    # 단어 추출 (2글자 이상 한글)
    words = re.findall(r'[가-힣]{2,}', text)
    
    # 조사 제거
    cleaned_words = []
    for word in words:
        # 조사 패턴 제거
        cleaned = word
        for pattern in josa_patterns:
            cleaned = re.sub(pattern, '', cleaned)
        
        # 조사 제거 후 남은 단어가 2글자 이상이고 불용어가 아니면 추가
        if len(cleaned) >= 2 and cleaned not in stop_words:
            cleaned_words.append(cleaned)
    
    # 빈도수 기반 키워드 추출 (최대 5개)
    word_counts = Counter(cleaned_words)
    keywords = [word for word, count in word_counts.most_common(5)]
    
    return keywords

