# Windows에서 ffmpeg 설치 방법

Whisper가 webm 파일을 처리하려면 ffmpeg가 필요합니다.

## 방법 1: Chocolatey 사용 (권장)

1. Chocolatey가 설치되어 있지 않다면 먼저 설치:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

2. ffmpeg 설치:
   ```powershell
   choco install ffmpeg
   ```

3. PowerShell 재시작 후 확인:
   ```powershell
   ffmpeg -version
   ```

## 방법 2: 수동 설치

1. https://www.gyan.dev/ffmpeg/builds/ 에서 다운로드
2. "ffmpeg-release-essentials.zip" 다운로드
3. 압축 해제 후 `bin` 폴더를 PATH 환경변수에 추가
4. PowerShell 재시작

## 설치 확인

```powershell
ffmpeg -version
```

설치 후 백엔드 서버를 재시작하세요.

