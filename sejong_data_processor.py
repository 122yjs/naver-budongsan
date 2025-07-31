#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
세종시 아파트 데이터 재분류 프로세서
공식 행정동-마을 매핑 기반 정확한 분류 시스템
"""

import json
import os
import pandas as pd
import re
from typing import Dict, List, Tuple, Any

class SejongApartmentClassifier:
    """세종시 아파트 분류기"""
    
    def __init__(self):
        # 공식 16개 아파트 마을 (실제 아파트가 있는 마을만)
        self.village_keywords = {
            '가락': '가락마을',        # 고운동 
            '가온': '가온마을',        # 다정동
            '가재': '가재마을',        # 종촌동
            '나릿재': '나릿재마을',    # 나성동
            '도램': '도램마을',        # 도담동 (도담/도램 패턴)
            '범지기': '범지기마을',    # 아름동
            '산울': '산울마을',        # 산울동
            '새나루': '새나루마을',    # 집현동
            '새뜸': '새뜸마을',        # 새롬동
            '새샘': '새샘마을',        # 소담동
            '수루배': '수루배마을',    # 반곡동
            '첫마을': '첫마을',        # 한솔동
            '한뜰': '한뜰마을',        # 어진동
            '해들': '해들마을',        # 대평동
            '해밀': '해밀마을',        # 해밀동
            '호려울': '호려울마을'     # 보람동
        }
        
        # 10단계 균등 분포 가격 구간
        self.price_ranges = [
            (0, 10000, '1억 미만'),
            (10000, 19999, '1억대'), 
            (20000, 29999, '2억대'),
            (30000, 39999, '3억대'),
            (40000, 49999, '4억대'),
            (50000, 59999, '5억대'),
            (60000, 69999, '6억대'),
            (70000, 79999, '7억대'),
            (80000, 89999, '8억대'),
            (90000, 200000, '9억 이상')
        ]
    
    def classify_village(self, complex_name: str) -> str:
        """
        아파트 단지명을 기반으로 마을 분류
        
        Args:
            complex_name: 아파트 단지명
            
        Returns:
            마을명 또는 '기타(도시형/오피스텔)'
        """
        complex_name = complex_name.strip()
        
        # 1순위: 예외 처리 (특정 단지 우선 분류)
        if '우빈가온' in complex_name:
            return '기타(도시형/오피스텔)'

        # 2순위: 직접 마을명 매칭
        for keyword, village_name in self.village_keywords.items():
            if keyword in complex_name:
                return village_name
        
        # 3순위: 특별한 패턴 처리
        # '도담' 패턴도 도램마을로 분류
        if '도담' in complex_name:
            return '도램마을'
            
        # 기타: 도시형, 오피스텔, 브랜드 아파트
        return '기타(도시형/오피스텔)'
    
    def classify_price_range(self, price: float) -> str:
        """
        가격을 기반으로 가격 구간 분류
        
        Args:
            price: 중간매매가 (만원)
            
        Returns:
            가격 구간명
        """
        if not price:
            return '정보없음'
            
        for min_price, max_price, range_name in self.price_ranges:
            if min_price <= price < max_price:
                return range_name
                
        return '9억 이상'  # 최고가 구간
    
    def classify_area_type(self, area: float) -> str:
        """
        면적을 기반으로 평형 분류
        
        Args:
            area: 대표면적 (㎡)
            
        Returns:
            평형 구간명
        """
        if not area:
            return '정보없음'
            
        pyeong = area / 3.3  # 평수 변환
        
        if pyeong < 20:
            return '소형 (20평 미만)'
        elif pyeong < 30:
            return '중소형 (20-30평)'
        elif pyeong < 40:
            return '중형 (30-40평)'
        else:
            return '대형 (40평 이상)'
    
    def process_data(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        전체 데이터 처리 및 통계 생성
        
        Args:
            data: 원본 아파트 데이터 리스트
            
        Returns:
            처리된 데이터 및 통계
        """
        processed_data = []
        village_stats = {}
        price_stats = {}
        total_count = len(data)
        
        for item in data:
            # 기본 정보 추출
            complex_name = item.get('단지명', '')
            price = item.get('중간매매가(만원)', 0)
            area = item.get('대표면적(㎡)', 0)
            
            # 분류 수행
            village = self.classify_village(complex_name)
            price_range = self.classify_price_range(price)
            area_type = self.classify_area_type(area)
            
            # 처리된 데이터 생성
            processed_item = {
                **item,  # 원본 데이터 유지
                '마을분류': village,
                '가격구간': price_range, 
                '평형구간': area_type
            }
            processed_data.append(processed_item)
            
            # 통계 수집
            if village not in village_stats:
                village_stats[village] = []
            if price:
                village_stats[village].append(price)
                
            if price_range not in price_stats:
                price_stats[price_range] = 0
            price_stats[price_range] += 1
        
        # 마을별 통계 계산
        village_summary = {}
        for village, prices in village_stats.items():
            if prices:
                village_summary[village] = {
                    '단지수': len(prices),
                    '평균가격': sum(prices) / len(prices),
                    '최저가격': min(prices),
                    '최고가격': max(prices),
                    '비율': (len(prices) / total_count) * 100
                }
        
        return {
            'processed_data': processed_data,
            'village_summary': village_summary,
            'price_distribution': price_stats,
            'total_count': total_count
        }

def main():
    """메인 실행 함수"""
    # 스크립트의 현재 위치를 기준으로 상대 경로 설정
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(script_dir, 'data', 'sejong_latest.csv')
    output_dir = os.path.join(script_dir, 'data')
    output_file = os.path.join(output_dir, 'sejong_classified.json')

    # 출력 디렉토리 생성
    os.makedirs(output_dir, exist_ok=True)

    try:
        # CSV 파일에서 데이터 로드
        df = pd.read_csv(input_file)
        # NaN 값을 처리하고 JSON 직렬화 가능한 형태로 변환
        raw_data = df.where(pd.notnull(df), None).to_dict('records')
        print(f"✅ 원본 데이터 로드 완료: {len(raw_data)}개 단지 ({input_file})")
    except FileNotFoundError:
        print(f"❌ 입력 파일 없음: {input_file}")
        print("먼저 main.py를 실행하여 데이터를 수집하세요.")
        return
    
    # 분류기 초기화 및 처리
    classifier = SejongApartmentClassifier()
    result = classifier.process_data(raw_data)
    
    # 분류 스키마를 JavaScript 모듈로 내보내기
    classifier.export_classification_schema()
    
    print("\n🏘️ 마을별 분류 결과:")
    print("-" * 60)
    sorted_villages = sorted(
        result['village_summary'].items(), 
        key=lambda x: x[1]['평균가격'], 
        reverse=True
    )
    for village, stats in sorted_villages:
        print(f"{village:15s}: {stats['단지수']:2d}개 단지, "
              f"평균 {stats['평균가격']:5.0f}만원 "
              f"({stats['최저가격']:,.0f}~{stats['최고가격']:,.0f})")
    
    # 처리된 데이터(아파트 목록)를 JSON 파일로 저장
    with open(output_file, 'w', encoding='utf-8') as f:
        # data.js는 배열을 기대하므로 'processed_data'만 저장
        json.dump(result['processed_data'], f, ensure_ascii=False, indent=4)
    
    print(f"\n✅ 처리 완료! 결과가 다음 파일에 저장되었습니다: {output_file}")
    return result

def export_classification_schema(self):
    """분류 스키마를 JavaScript에서 사용할 수 있는 형식으로 내보내기"""
    schema = {
        "village_keywords": self.village_keywords,
        "price_ranges": [
            {"min": min_price, "max": max_price, "name": range_name}
            for min_price, max_price, range_name in self.price_ranges
        ],
        "area_types": [
            {"min": 0, "max": 66, "name": "소형 (20평 미만)"},
            {"min": 66, "max": 99, "name": "중소형 (20-30평)"},
            {"min": 99, "max": 132, "name": "중형 (30-40평)"},
            {"min": 132, "max": 1000, "name": "대형 (40평 이상)"}
        ]
    }
    
    # 스키마를 JavaScript 모듈로 저장
    js_file_path = os.path.join(script_dir, 'apartment_comparison', 'constants.js')
    with open(js_file_path, 'w', encoding='utf-8') as f:
        f.write("// 세종시 아파트 데이터 표준 분류 체계\n")
        f.write("// sejong_data_processor.py에서 자동 생성됨\n\n")
        
        # 마을 목록
        f.write("export const VILLAGES = [\n")
        villages = list(self.village_keywords.values()) + ['기타(도시형/오피스텔)']
        villages_str = ", ".join([f"'{v}'" for v in villages])
        f.write(f"    {villages_str}\n");
        f.write("];\n\n")
        
        # 가격 구간
        f.write("export const PRICE_RANGES = [\n")
        for range_data in schema["price_ranges"]:
            f.write(f"    {{ min: {range_data['min']}, max: {range_data['max']}, "
                   f"name: \"{range_data['name']}\" }},\n")
        f.write("];\n\n")
        
        # 평형 구간
        f.write("export const AREA_TYPES = [\n")
        for area_type in schema["area_types"]:
            f.write(f"    {{ min: {area_type['min']}, max: {area_type['max']}, "
                   f"name: \"{area_type['name']}\" }},\n")
        f.write("];\n\n")
        
        # 마을 키워드
        f.write("export const VILLAGE_KEYWORDS = {\n")
        for keyword, village in self.village_keywords.items():
            f.write(f"    '{keyword}': '{village}',\n")
        f.write("};\n")
    
    print(f"✅ 분류 스키마가 JavaScript 모듈로 저장되었습니다: {js_file_path}")
    return schema

if __name__ == "__main__":
    main()