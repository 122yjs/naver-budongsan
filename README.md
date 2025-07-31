# 네이버 부동산 세종시 아파트 분석 도구

세종시 아파트 매물 데이터를 수집, 분석 및 시각화하는 통합 도구입니다.

## 📁 프로젝트 구조

```
naver-budongsan/
├── main.py                    # 데이터 수집 엔진
├── sejong_data_processor.py   # 데이터 분류 및 처리
├── requirements.txt           # 패키지 의존성
├── apartment_comparison/      # 웹 분석 도구
│   ├── index.html            # 메인 웹 인터페이스
│   ├── app.js                # 애플리케이션 로직
│   ├── data.js               # 데이터 설정
│   └── README.md             # 웹 도구 사용법
├── data/                     # 데이터 저장소
│   ├── sejong_classified.json # 분류된 아파트 데이터
│   └── sejong_latest.csv      # 최신 CSV 데이터
└── README.md                 # 프로젝트 문서 (이 파일)
```

## 🚀 시작하기

### 1. 환경 설정

```bash
# 필수 패키지 설치
pip install -r requirements.txt
```

### 2. 데이터 수집

```bash
# 세종시 아파트 데이터 수집
python main.py
```

### 3. 데이터 분류 및 처리

```bash
# 수집된 데이터 분류 및 마을별 정리
python sejong_data_processor.py
```

### 4. 웹 분석 도구 사용

```bash
# apartment_comparison 폴더의 index.html을 브라우저에서 열기
# 또는 로컬 서버 실행:
cd apartment_comparison
python -m http.server 8000
```

## 📊 주요 기능

### 데이터 수집 (main.py)
- 네이버 부동산 API를 통한 실시간 매물 정보 수집
- 세종시 전체 아파트 단지 및 매물 정보 추출
- 자동 페이지네이션 및 API 제한 대응
- Excel/CSV 다중 포맷 저장

### 데이터 분류 (sejong_data_processor.py)
- 16개 마을별 아파트 단지 자동 분류
- 10단계 균등 분포 가격 구간 설정
- 평형별 면적 분류 (소형/중소형/중형/대형)
- 통계 분석 및 요약 정보 생성

### 웹 분석 도구 (apartment_comparison/)
- 인터랙티브 차트 및 그래프
- 마을별/가격대별 필터링
- 실시간 통계 업데이트
- 반응형 웹 디자인

## 📈 데이터 구조

### 수집 데이터 필드
- **단지 정보**: 단지명, 준공년도, 총세대수, 위치정보
- **가격 정보**: 최소/최대/중간 매매가격
- **면적 정보**: 최소/최대/대표 면적
- **매물 정보**: 거래유형, 층수, 방향 등

### 분류 데이터 필드
- **마을분류**: 16개 마을 + 기타(도시형/오피스텔)
- **가격구간**: 10단계 균등 분포 구간
- **평형구간**: 4단계 면적 분류

## 🛠️ 기술 스택

- **Backend**: Python 3.8+
- **HTTP 클라이언트**: requests
- **데이터 처리**: pandas, numpy
- **파일 처리**: openpyxl (Excel)
- **Frontend**: HTML5, JavaScript (ES6), Chart.js
- **스타일링**: Bootstrap 5

## ⚠️ 주의사항

1. **API 사용 제한**: 네이버 부동산 API 사용 시 적절한 딜레이 설정
2. **데이터 저작권**: 수집된 데이터는 개인 연구 목적으로만 사용
3. **실행 환경**: Python 3.8 이상 권장
4. **브라우저 호환성**: 모던 브라우저 환경에서 최적화

## 📝 라이선스

이 프로젝트는 개인 연구 및 학습 목적으로 제작되었습니다.
상업적 사용 전 네이버 부동산 서비스 이용약관을 확인하세요.

## 🔧 개발자 정보

- **최신 업데이트**: 2025년 7월 30일
- **개발 환경**: Windows 11, Python 3.8+
- **데이터 소스**: 네이버 부동산 (new.land.naver.com)