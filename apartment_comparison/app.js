// 세종시 아파트 가격 비교 애플리케이션
// 메인 로직 및 이벤트 처리

// 표준 분류 체계 임포트
import { VILLAGES, PRICE_RANGES, AREA_TYPES } from './constants.js';
// 데이터 처리 함수 임포트
import { initializeData } from './data.js';

// 전역 변수
let villageChart = null;
let priceChart = null;
let currentSort = 'price-desc';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async function() {
    showLoading(true);
    
    try {
        // 1. 데이터 초기화 및 검증
        await initializeData();
        console.log('데이터 로딩 완료:', window.apartmentData.length, '개 단지');
        
        // 2. 데이터 유효성 검증
        if (!window.apartmentData || window.apartmentData.length === 0) {
            throw new Error('데이터 로딩 실패: 아파트 데이터가 없습니다.');
        }
        
        // 3. 데이터 분류 검증
        validateDataClassification();
        
        // 4. 필터링된 데이터 초기화 (모든 데이터로 시작)
        window.filteredData = [...window.apartmentData];
        
        // 5. 필터 및 차트 초기화 (데이터 로드 완료 후)
        initializeFilters();
        initializeCharts();
        updateDisplay();
        setupEventListeners();
        
        console.log('✅ 애플리케이션 초기화 완료');
        console.log('📊 차트 데이터 검증:', {
            villageCount: new Set(window.apartmentData.map(item => item.마을분류)).size,
            priceDataCount: window.apartmentData.filter(item => item['중간매매가(만원)']).length
        });
        
    } catch (error) {
        console.error('❌ 초기화 오류:', error);
        showError('데이터를 불러오는 중 오류가 발생했습니다: ' + error.message);
        showChartError();
    } finally {
        showLoading(false);
    }
});

// 데이터 분류 검증 함수
function validateDataClassification() {
    const villageStats = {};
    const priceStats = {};
    
    window.apartmentData.forEach(item => {
        // 마을 분류 통계
        const village = item.마을분류;
        if (!villageStats[village]) {
            villageStats[village] = 0;
        }
        villageStats[village]++;
        
        // 가격 구간 통계
        const priceRange = item.가격구간;
        if (!priceStats[priceRange]) {
            priceStats[priceRange] = 0;
        }
        priceStats[priceRange]++;
    });
    
    console.log('🏘️ 마을별 분류:', villageStats);
    console.log('💰 가격별 분류:', priceStats);
    
    // 16개 마을 + 기타가 모두 있는지 확인
    const expectedVillages = VILLAGES.length;  // 17개 (16개 마을 + 기타)
    const actualVillages = Object.keys(villageStats).length;
    
    if (actualVillages < 10) {  // 최소 10개 이상은 있어야 함
        console.warn('⚠️ 마을 분류 부족:', actualVillages, '/ 예상:', expectedVillages);
    }
}

// 로딩 표시/숨김
function showLoading(show) {
    const loading = document.getElementById('loading');
    const tableBody = document.getElementById('tableBody');
    
    if (show) {
        loading.style.display = 'block';
        tableBody.style.display = 'none';
    } else {
        loading.style.display = 'none';
        tableBody.style.display = 'table-row-group';
    }
}

// 오류 메시지 표시
function showError(message) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-danger py-4">
                <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                <div>${message}</div>
            </td>
        </tr>
    `;
}

// 차트 오류 표시
function showChartError() {
    const villageChartContainer = document.getElementById('villageChart').parentElement;
    const priceChartContainer = document.getElementById('priceChart').parentElement;
    
    const errorHtml = `
        <div class="text-center text-muted py-4">
            <i class="fas fa-chart-bar fa-2x mb-2 opacity-50"></i>
            <div>차트를 불러올 수 없습니다</div>
            <small>데이터 로딩 중 오류가 발생했습니다</small>
        </div>
    `;
    
    villageChartContainer.innerHTML = errorHtml;
    priceChartContainer.innerHTML = errorHtml;
}

// 필터 초기화
function initializeFilters() {
    initializeVillageFilters();
    initializePriceFilters();
    initializeAreaFilters();
}

// 마을 필터 초기화
function initializeVillageFilters() {
    const container = document.getElementById('villageFilters');
    
    // 마을별 단지 수 계산
    const villageCounts = {};
    VILLAGES.forEach(village => {
        villageCounts[village] = window.apartmentData.filter(item => 
            item.마을분류 === village
        ).length;
    });
    
    container.innerHTML = VILLAGES.filter(village => village !== '전체').map(village => `
        <div class="filter-item">
            <input type="checkbox" id="village-${village}" value="${village}" checked>
            <label for="village-${village}" class="mb-0">
                ${village} <span class="text-muted">(${villageCounts[village]}개)</span>
            </label>
        </div>
    `).join('');
}

// 가격 필터 초기화
function initializePriceFilters() {
    const container = document.getElementById('priceFilters');
    
    // 가격대별 단지 수 계산
    const priceCounts = {};
    PRICE_RANGES.forEach(range => {
        priceCounts[range.name] = window.apartmentData.filter(item => 
            item.가격구간 === range.name
        ).length;
    });
    
    container.innerHTML = PRICE_RANGES.map(range => `
        <div class="filter-item">
            <input type="checkbox" id="price-${range.name}" value="${range.name}" checked>
            <label for="price-${range.name}" class="mb-0">
                ${range.name} <span class="text-muted">(${priceCounts[range.name] || 0}개)</span>
            </label>
        </div>
    `).join('');
}

// 평형 필터 초기화
function initializeAreaFilters() {
    const container = document.getElementById('areaFilters');
    
    // 평형별 단지 수 계산
    const areaCounts = {};
    AREA_TYPES.forEach(area => {
        areaCounts[area.name] = window.apartmentData.filter(item => 
            item.평형구간 === area.name
        ).length;
    });
    
    container.innerHTML = AREA_TYPES.map(area => `
        <div class="filter-item">
            <input type="checkbox" id="area-${area.name}" value="${area.name}" checked>
            <label for="area-${area.name}" class="mb-0">
                ${area.name} <span class="text-muted">(${areaCounts[area.name] || 0}개)</span>
            </label>
        </div>
    `).join('');
}

// 차트 초기화
function initializeCharts() {
    try {
        // 데이터 유효성 재확인
        if (!window.filteredData || window.filteredData.length === 0) {
            throw new Error('필터링된 데이터가 없습니다');
        }
        
        console.log('📊 차트 초기화 시작 - 데이터 수:', window.filteredData.length);
        
        initializeVillageChart();
        initializePriceChart();
        
        console.log('✅ 차트 초기화 완료');
    } catch (error) {
        console.error('❌ 차트 초기화 실패:', error);
        showChartError();
    }
}

// 마을별 평균 가격 차트
function initializeVillageChart() {
    const ctx = document.getElementById('villageChart').getContext('2d');
    
    // 마을별 평균 가격 계산
    const villageData = calculateVillageStats();
    
    // 데이터가 없으면 차트 생성 중단
    if (!villageData.labels || villageData.labels.length === 0) {
        console.warn('⚠️ 마을별 차트: 표시할 데이터가 없습니다');
        return;
    }
    
    if (villageChart) {
        villageChart.destroy();
    }
    
    villageChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: villageData.labels,
            datasets: [{
                label: '평균 가격 (만원)',
                data: villageData.prices,
                backgroundColor: 'rgba(37, 99, 235, 0.6)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + '만원';
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `평균 가격: ${context.parsed.y.toLocaleString()}만원`;
                        }
                    }
                }
            }
        }
    });
}

// 가격대별 분포 차트
function initializePriceChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // 가격대별 분포 계산
    const priceData = calculatePriceDistribution();
    
    // 데이터가 없으면 차트 생성 중단
    if (!priceData.labels || priceData.labels.length === 0) {
        console.warn('⚠️ 가격 분포 차트: 표시할 데이터가 없습니다');
        return;
    }
    
    if (priceChart) {
        priceChart.destroy();
    }
    
    priceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: priceData.labels,
            datasets: [{
                data: priceData.counts,
                backgroundColor: [
                    '#ef4444', '#f97316', '#eab308', '#84cc16',
                    '#22c55e', '#06b6d4', '#3b82f6', '#6366f1',
                    '#8b5cf6', '#a855f7'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed}개 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 마을별 통계 계산
function calculateVillageStats() {
    const stats = {};
    
    // 데이터 유효성 검증
    if (!window.filteredData || window.filteredData.length === 0) {
        console.warn('⚠️ 마을별 통계 계산: 필터링된 데이터가 없습니다');
        return { labels: [], prices: [] };
    }
    
    // 기타 제외하고 실제 마을만
    const realVillages = VILLAGES.filter(v => v !== '기타(도시형/오피스텔)');
    
    realVillages.forEach(village => {
        const villageData = window.filteredData.filter(item => 
            item.마을분류 === village && 
            item['중간매매가(만원)'] && 
            !isNaN(item['중간매매가(만원)']) &&
            item['중간매매가(만원)'] > 0
        );
        
        if (villageData.length > 0) {
            const prices = villageData.map(item => item['중간매매가(만원)']);
            stats[village] = prices.reduce((a, b) => a + b, 0) / prices.length;
        }
    });
    
    console.log('📊 마을별 통계:', stats);
    
    // 데이터가 없으면 빈 결과 반환
    if (Object.keys(stats).length === 0) {
        console.warn('⚠️ 마을별 통계: 유효한 가격 데이터가 없습니다');
        return { labels: [], prices: [] };
    }
    
    // 가격 높은 순으로 정렬
    const sorted = Object.entries(stats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10); // 상위 10개만
    
    return {
        labels: sorted.map(([village]) => village.replace('마을', '')),
        prices: sorted.map(([, price]) => Math.round(price))
    };
}

// 가격 분포 계산
function calculatePriceDistribution() {
    // 데이터 유효성 검증
    if (!window.filteredData || window.filteredData.length === 0) {
        console.warn('⚠️ 가격 분포 계산: 필터링된 데이터가 없습니다');
        return { labels: [], counts: [] };
    }
    
    const distribution = {};
    
    PRICE_RANGES.forEach(range => {
        distribution[range.name] = window.filteredData.filter(item => 
            item.가격구간 === range.name
        ).length;
    });
    
    console.log('📊 가격대별 분포:', distribution);
    
    // 0이 아닌 항목만 필터링
    const nonZero = Object.entries(distribution)
        .filter(([, count]) => count > 0);
    
    // 데이터가 없으면 빈 결과 반환
    if (nonZero.length === 0) {
        console.warn('⚠️ 가격 분포: 유효한 분포 데이터가 없습니다');
        return { labels: [], counts: [] };
    }
    
    return {
        labels: nonZero.map(([range]) => range),
        counts: nonZero.map(([, count]) => count)
    };
}

// 체크박스 전체 선택/해제 유틸리티 함수
function toggleAllCheckboxes(type, checked) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][id^="${type}-"]`);
    checkboxes.forEach(cb => cb.checked = checked);
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 필터 변경 이벤트
    document.addEventListener('change', function(e) {
        if (e.target.matches('input[type="checkbox"]')) {
            applyFilters();
        }
    });

    // 정렬 변경 이벤트
    document.getElementById('sortSelect').addEventListener('change', function(e) {
        currentSort = e.target.value;
        updateTable();
    });

    // 필터 버튼 이벤트 (이벤트 위임 사용)
    document.addEventListener('click', function(e) {
        const target = e.target.closest('button');
        if (!target) return;

        const actions = {
            'selectAllVillagesBtn': () => toggleAllCheckboxes('village', true),
            'clearAllVillagesBtn': () => toggleAllCheckboxes('village', false),
            'selectAllPricesBtn': () => toggleAllCheckboxes('price', true),
            'clearAllPricesBtn': () => toggleAllCheckboxes('price', false),
            'selectAllAreasBtn': () => toggleAllCheckboxes('area', true),
            'clearAllAreasBtn': () => toggleAllCheckboxes('area', false),
        };

        if (actions[target.id]) {
            actions[target.id]();
            applyFilters();
        }
    });
}

// 필터 적용
function applyFilters() {
    const selectedVillages = getSelectedFilters('village');
    const selectedPrices = getSelectedFilters('price');
    const selectedAreas = getSelectedFilters('area');
    
    console.log('🔍 필터 적용 시작:', {
        selectedVillages: selectedVillages,
        selectedPrices: selectedPrices,
        selectedAreas: selectedAreas,
        totalData: window.apartmentData.length
    });
    
    // 데이터 유효성 검증
    if (!window.apartmentData || window.apartmentData.length === 0) {
        console.warn('⚠️ 원본 데이터가 없습니다');
        window.filteredData = [];
        updateDisplay();
        return;
    }
    
    let debugCount = 0;
    window.filteredData = window.apartmentData.filter(item => {
        // 각 필터 조건 개별 검증
        const villageMatch = selectedVillages.length === 0 || 
            selectedVillages.includes(item.마을분류);
        const priceMatch = selectedPrices.length === 0 || 
            selectedPrices.includes(item.가격구간);
        const areaMatch = selectedAreas.length === 0 || 
            selectedAreas.includes(item.평형구간);
        
        const finalMatch = villageMatch && priceMatch && areaMatch;
        
        // 디버깅용 로그 (처음 5개 항목만)
        if (debugCount < 5 && finalMatch) {
            console.log(`📋 ${item.단지명}:`, {
                마을분류: item.마을분류,
                가격구간: item.가격구간,
                평형구간: item.평형구간,
                villageMatch,
                priceMatch,
                areaMatch,
                finalMatch
            });
            debugCount++;
        }
        
        return finalMatch;
    });
    
    console.log('✅ 필터링 완료:', {
        filteredCount: window.filteredData.length,
        originalCount: window.apartmentData.length
    });
    
    updateDisplay();
}

// 선택된 필터 값 가져오기
function getSelectedFilters(type) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][id^="${type}-"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

// 화면 업데이트
function updateDisplay() {
    updateStatistics();
    updateTable();
    updateCharts();
}

// 통계 업데이트
function updateStatistics() {
    const data = window.filteredData.filter(item => item['중간매매가(만원)']);
    
    if (data.length === 0) {
        document.getElementById('totalCount').textContent = '0';
        document.getElementById('avgPrice').textContent = '0';
        document.getElementById('minPrice').textContent = '0';
        document.getElementById('maxPrice').textContent = '0';
        return;
    }
    
    const prices = data.map(item => item['중간매매가(만원)']);
    const total = data.length;
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    document.getElementById('totalCount').textContent = total.toLocaleString();
    document.getElementById('avgPrice').textContent = avg.toLocaleString();
    document.getElementById('minPrice').textContent = min.toLocaleString();
    document.getElementById('maxPrice').textContent = max.toLocaleString();
}

// 테이블 업데이트
function updateTable() {
    const tableBody = document.getElementById('tableBody');
    const noResults = document.getElementById('noResults');
    
    if (window.filteredData.length === 0) {
        tableBody.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    tableBody.style.display = 'table-row-group';
    noResults.style.display = 'none';
    
    // 정렬 적용
    const sortedData = [...window.filteredData].sort(getSortFunction(currentSort));
    
    tableBody.innerHTML = sortedData.map(item => `
        <tr>
            <td>
                <div class="fw-semibold">${item.단지명}</div>
                <div class="small text-muted">${item.표시년도} · ${item.총세대수 || 0}세대</div>
            </td>
            <td>
                <span class="village-tag">${item.마을분류}</span>
            </td>
            <td>
                <div class="fw-semibold">${item.표시가격}</div>
                <span class="price-badge ${item.가격배지}">${item.가격구간}</span>
            </td>
            <td>
                <div class="fw-semibold">${item.표시면적}</div>
                <span class="area-badge">${item.평형구간}</span>
            </td>
            <td>${item.표시년도}</td>
            <td>${(item.총세대수 || 0).toLocaleString()}세대</td>
        </tr>
    `).join('');
}

// 정렬 함수 가져오기
function getSortFunction(sortType) {
    switch (sortType) {
        case 'price-desc':
            return (a, b) => (b['중간매매가(만원)'] || 0) - (a['중간매매가(만원)'] || 0);
        case 'price-asc':
            return (a, b) => (a['중간매매가(만원)'] || 0) - (b['중간매매가(만원)'] || 0);
        case 'name-asc':
            return (a, b) => a.단지명.localeCompare(b.단지명);
        case 'area-desc':
            return (a, b) => (b['대표면적(㎡)'] || 0) - (a['대표면적(㎡)'] || 0);
        default:
            return (a, b) => 0;
    }
}

// 차트 업데이트
function updateCharts() {
    try {
        // 마을별 차트 업데이트
        if (villageChart) {
            const villageData = calculateVillageStats();
            if (villageData.labels && villageData.labels.length > 0) {
                villageChart.data.labels = villageData.labels;
                villageChart.data.datasets[0].data = villageData.prices;
                villageChart.update();
            } else {
                console.warn('⚠️ 마을별 차트 업데이트: 데이터가 없습니다');
            }
        }
        
        // 가격 분포 차트 업데이트
        if (priceChart) {
            const priceData = calculatePriceDistribution();
            if (priceData.labels && priceData.labels.length > 0) {
                priceChart.data.labels = priceData.labels;
                priceChart.data.datasets[0].data = priceData.counts;
                priceChart.update();
            } else {
                console.warn('⚠️ 가격 분포 차트 업데이트: 데이터가 없습니다');
            }
        }
    } catch (error) {
        console.error('❌ 차트 업데이트 오류:', error);
    }
}

// 유틸리티 함수들
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 검색 기능 (향후 확장용)
function searchApartments(query) {
    if (!query) {
        window.filteredData = [...window.apartmentData];
    } else {
        window.filteredData = window.apartmentData.filter(item =>
            item.단지명.toLowerCase().includes(query.toLowerCase()) ||
            item.마을분류.toLowerCase().includes(query.toLowerCase())
        );
    }
    updateDisplay();
}
