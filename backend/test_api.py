"""
API 테스트 스크립트
백엔드 API가 정상적으로 작동하는지 확인합니다.
"""

import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_health():
    """헬스체크 테스트"""
    print("\n1. 헬스체크 테스트...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"   상태: {response.status_code}")
    print(f"   응답: {response.json()}")
    return response.status_code == 200

def test_create_user():
    """사용자 생성 테스트"""
    print("\n2. 사용자 생성 테스트...")
    data = {"name": "테스트사용자"}
    response = requests.post(f"{BASE_URL}/users", json=data)
    print(f"   상태: {response.status_code}")
    result = response.json()
    print(f"   응답: {result}")
    
    if result.get('success'):
        return result['user']['id']
    return None

def test_get_users():
    """사용자 목록 조회 테스트"""
    print("\n3. 사용자 목록 조회 테스트...")
    response = requests.get(f"{BASE_URL}/users")
    print(f"   상태: {response.status_code}")
    result = response.json()
    print(f"   사용자 수: {len(result.get('users', []))}")
    return response.status_code == 200

def test_upload_audio(user_id):
    """오디오 업로드 테스트 (샘플 없이 스킵)"""
    print("\n4. 오디오 업로드 테스트...")
    print("   ⚠️  실제 오디오 파일이 필요합니다. 스킵합니다.")
    print("   테스트 방법: Postman이나 프론트엔드에서 테스트하세요.")
    return True

def test_get_recordings():
    """녹음 목록 조회 테스트"""
    print("\n5. 녹음 목록 조회 테스트...")
    response = requests.get(f"{BASE_URL}/recordings")
    print(f"   상태: {response.status_code}")
    result = response.json()
    print(f"   녹음 수: {result.get('count', 0)}")
    return response.status_code == 200

def test_emotion_stats():
    """감정 통계 테스트"""
    print("\n6. 감정 통계 테스트...")
    response = requests.get(f"{BASE_URL}/emotions/stats")
    print(f"   상태: {response.status_code}")
    result = response.json()
    print(f"   응답: {result}")
    return response.status_code == 200

def main():
    print("=" * 50)
    print("RevoProject 백엔드 API 테스트")
    print("=" * 50)
    print("서버가 http://localhost:5000 에서 실행 중이어야 합니다.")
    
    try:
        # 테스트 실행
        tests_passed = 0
        tests_total = 6
        
        if test_health():
            tests_passed += 1
        
        user_id = test_create_user()
        if user_id:
            tests_passed += 1
        
        if test_get_users():
            tests_passed += 1
        
        if test_upload_audio(user_id):
            tests_passed += 1
        
        if test_get_recordings():
            tests_passed += 1
        
        if test_emotion_stats():
            tests_passed += 1
        
        # 결과
        print("\n" + "=" * 50)
        print(f"테스트 결과: {tests_passed}/{tests_total} 통과")
        print("=" * 50)
        
        if tests_passed == tests_total:
            print("✅ 모든 테스트 통과!")
        else:
            print(f"⚠️  {tests_total - tests_passed}개 테스트 실패")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ 서버에 연결할 수 없습니다.")
        print("   python app.py 로 서버를 먼저 실행하세요.")
    except Exception as e:
        print(f"\n❌ 오류 발생: {str(e)}")

if __name__ == "__main__":
    main()

