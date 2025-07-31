import requests
import json
import pandas as pd
import time
from datetime import datetime
import os

class SejongRealEstateExtractor:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://new.land.naver.com/",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept": "application/json"
        }
        self.base_url = "https://new.land.naver.com/api"
        self.delay = 0.5  # 0.5초 딜레이 (rate limiting)
        
    def _request_with_retry(self, url, max_retries=3):
        """HTTP 요청 with retry logic"""
        for attempt in range(max_retries):
            try:
                response = requests.get(url, headers=self.headers, timeout=10)
                response.raise_for_status()
                time.sleep(self.delay)  # Rate limiting
                return response.json()
            except requests.exceptions.RequestException as e:
                print(f"요청 실패 (시도 {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise
    
    def get_sejong_regions(self):
        """세종시 하위 행정구역 조회"""
        # 세종시 코드: 3611000000
        url = f"{self.base_url}/regions/list?cortarNo=3611000000"
        return self._request_with_retry(url)
    
    def get_complexes_by_region(self, cortar_no, real_estate_type="APT:ABYG:JGC"):
        """특정 지역의 아파트 단지 목록 조회"""
        url = f"{self.base_url}/regions/complexes?cortarNo={cortar_no}&realEstateType={real_estate_type}"
        data = self._request_with_retry(url)
        return data.get("complexes", [])
    
    def get_complex_detail(self, complex_no):
        """아파트 단지 상세 정보 조회"""
        url = f"{self.base_url}/complexes/{complex_no}?sameAddressGroup=false"
        return self._request_with_retry(url)
    
    def get_articles(self, complex_no, page=1, trade_type="", price_type="RETAIL"):
        """매물 목록 조회"""
        url = (
            f"{self.base_url}/articles/complex/{complex_no}"
            f"?realEstateType=APT:ABYG:JGC&page={page}"
            f"&priceType={price_type}"
        )
        if trade_type:
            url += f"&tradeType={trade_type}"
            
        data = self._request_with_retry(url)
        return data.get("articleList", []), data.get("isMoreData", False)
    
    def get_all_articles_for_complex(self, complex_no):
        """단지의 모든 매물 조회 (페이지네이션 처리)"""
        all_articles = []
        page = 1
        
        while True:
            articles, has_more = self.get_articles(complex_no, page)
            if not articles:
                break
                
            all_articles.extend(articles)
            print(f"  - {complex_no} 단지: {page}페이지 {len(articles)}개 매물 수집")
            
            if not has_more:
                break
                
            page += 1
            
        return all_articles
    
    def extract_sejong_data(self):
        """세종시 전체 매물 데이터 추출"""
        print("세종시 매물 데이터 추출 시작...")
        
        # 결과 저장용 리스트
        all_complexes = []
        all_articles = []
        
        # 세종시 하위 지역 조회
        print("\n1. 세종시 하위 지역 조회 중...")
        regions = self.get_sejong_regions()
        
        if not regions:
            # 세종시는 단일 행정구역이므로 직접 코드 사용
            sejong_codes = ["3611000000"]  # 세종시 전체
        else:
            sejong_codes = [r["cortarNo"] for r in regions.get("regionList", [])]
        
        # 각 지역별로 단지 조회
        print(f"\n2. {len(sejong_codes)}개 지역의 아파트 단지 조회 중...")
        for cortar_no in sejong_codes:
            complexes = self.get_complexes_by_region(cortar_no)
            print(f"  - {cortar_no}: {len(complexes)}개 단지 발견")
            
            for complex_data in complexes:
                complex_no = complex_data["complexNo"]
                
                # 단지 상세 정보 조회
                try:
                    detail = self.get_complex_detail(complex_no)
                    complex_info = {
                        "complexNo": complex_no,
                        "complexName": detail.get("complexName"),
                        "cortarNo": cortar_no,
                        "roadAddress": detail.get("roadAddressPrefix"),
                        "totalHouseholdCount": detail.get("totalHouseholdCount"),
                        "highFloor": detail.get("highFloor"),
                        "lowFloor": detail.get("lowFloor"),
                        "completionYear": detail.get("completionYear"),
                        "latitude": detail.get("latitude"),
                        "longitude": detail.get("longitude"),
                        "dealPriceMin": detail.get("dealPriceMin"),
                        "dealPriceMax": detail.get("dealPriceMax"),
                        "extractDate": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
                    all_complexes.append(complex_info)
                    
                    # 매물 정보 조회
                    articles = self.get_all_articles_for_complex(complex_no)
                    
                    for article in articles:
                        article_info = {
                            "complexNo": complex_no,
                            "complexName": detail.get("complexName"),
                            "articleNo": article.get("articleNo"),
                            "articleName": article.get("articleName"),
                            "tradeTypeName": article.get("tradeTypeName"),
                            "dealOrWarrantPrc": article.get("dealOrWarrantPrc"),
                            "rentPrc": article.get("rentPrc"),
                            "areaName": article.get("areaName"),
                            "area1": article.get("area1"),  # 공급면적
                            "area2": article.get("area2"),  # 전용면적
                            "floorInfo": article.get("floorInfo"),
                            "direction": article.get("direction"),
                            "articleConfirmYmd": article.get("articleConfirmYmd"),
                            "realtorName": article.get("realtorName"),
                            "extractDate": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        }
                        all_articles.append(article_info)
                        
                except Exception as e:
                    print(f"  ! 오류 발생 (단지 {complex_no}): {e}")
                    continue
        
        return all_complexes, all_articles
    
    def save_to_files(self, complexes, articles, output_dir="sejong_real_estate_data"):
        """데이터를 파일로 저장"""
        os.makedirs(output_dir, exist_ok=True)
        
        # 타임스탬프 생성
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # DataFrame 생성 및 저장
        df_complexes = pd.DataFrame(complexes)
        df_articles = pd.DataFrame(articles)
        
        # CSV 저장
        complexes_file = os.path.join(output_dir, f"sejong_complexes_{timestamp}.csv")
        articles_file = os.path.join(output_dir, f"sejong_articles_{timestamp}.csv")
        
        df_complexes.to_csv(complexes_file, index=False, encoding='utf-8-sig')
        df_articles.to_csv(articles_file, index=False, encoding='utf-8-sig')
        
        # Excel 저장 (선택사항)
        excel_file = os.path.join(output_dir, f"sejong_real_estate_{timestamp}.xlsx")
        with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
            df_complexes.to_excel(writer, sheet_name='단지정보', index=False)
            df_articles.to_excel(writer, sheet_name='매물정보', index=False)
        
        # 요약 정보 출력
        print(f"\n=== 데이터 추출 완료 ===")
        print(f"단지 수: {len(df_complexes)}개")
        print(f"매물 수: {len(df_articles)}개")
        print(f"\n저장 위치:")
        print(f"  - {complexes_file}")
        print(f"  - {articles_file}")
        print(f"  - {excel_file}")
        
        # 간단한 통계 출력
        if len(df_articles) > 0:
            print(f"\n=== 매물 통계 ===")
            print(f"거래 유형별 매물 수:")
            print(df_articles['tradeTypeName'].value_counts())
            
            # 가격 통계 (매매 기준)
            sale_articles = df_articles[df_articles['tradeTypeName'] == '매매']
            if len(sale_articles) > 0:
                print(f"\n매매가 통계:")
                print(f"  - 평균: {sale_articles['dealOrWarrantPrc'].mean():,.0f}만원")
                print(f"  - 최소: {sale_articles['dealOrWarrantPrc'].min():,.0f}만원")
                print(f"  - 최대: {sale_articles['dealOrWarrantPrc'].max():,.0f}만원")
        
        return df_complexes, df_articles


def main():
    """메인 실행 함수"""
    extractor = SejongRealEstateExtractor()
    
    try:
        # 데이터 추출
        complexes, articles = extractor.extract_sejong_data()
        
        # 파일로 저장
        df_complexes, df_articles = extractor.save_to_files(complexes, articles)
        
        # 추가 분석 예시
        print("\n=== 추가 분석 ===")
        
        # 단지별 매물 수
        if len(df_articles) > 0:
            complex_counts = df_articles.groupby('complexName').size().sort_values(ascending=False)
            print("\n매물이 많은 상위 10개 단지:")
            print(complex_counts.head(10))
        
    except Exception as e:
        print(f"\n오류 발생: {e}")
        raise


if __name__ == "__main__":
    main()