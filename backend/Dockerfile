# Python 3.11 베이스 이미지
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치 (ffmpeg는 Whisper에 필요)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Python 의존성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# pip 캐시 정리
RUN pip cache purge

# 애플리케이션 코드 복사
COPY . .

# uploads 디렉토리 생성
RUN mkdir -p uploads

# 포트 노출 (Railway는 PORT 환경변수 사용)
EXPOSE 5000

# 환경변수 설정
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# gunicorn으로 실행 (프로덕션)
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--timeout", "300", "app:app"]

