// ── Shared Taiwan GeoJSON (fetches once, reused by all map dashboards) ──────
const _GEO_JSON_URL = 'https://raw.githubusercontent.com/g0v/twgeojson/master/json/twCounty2010.geo.json';
const _GEO_NAME_NORMALIZE = {
    '台東縣': '臺東縣', '台北市': '臺北市', '台中市': '臺中市',
    '台南市': '臺南市', '桃園縣': '桃園市'
};
const _GEO_OFFSHORE = new Set(['金門縣', '澎湖縣', '連江縣']);

const _geoJsonPromise = fetch(_GEO_JSON_URL)
    .then(r => r.json())
    .then(geoJson => {
        geoJson.features.forEach(f => {
            const n = f.properties.name || f.properties.COUNTYNAME;
            const newName = _GEO_NAME_NORMALIZE[n] || n;
            f.properties.name = newName;
            f.properties.COUNTYNAME = newName;
        });
        if (!echarts.getMap('Taiwan')) echarts.registerMap('Taiwan', geoJson);
        // Register mainland-only map (excludes offshore islands) for fixed-size charts
        if (!echarts.getMap('TaiwanMain')) {
            echarts.registerMap('TaiwanMain', {
                type: 'FeatureCollection',
                features: geoJson.features.filter(f => !_GEO_OFFSHORE.has(f.properties.name))
            });
        }
        return geoJson;
    });

// ── Shared debounced resize dispatcher (200ms, single listener) ─────────────
const _resizeHandlers = new Set();
window.addEventListener('resize', (() => {
    let _resizeTimer;
    return () => {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(() => { _resizeHandlers.forEach(fn => fn()); }, 200);
    };
})());

// ── Safe resize: skip ECharts instances whose tab is currently hidden ─────────
// Calling chart.resize() while display:none zeroes the canvas → 破圖
// offsetParent===null means element (or ancestor) has display:none
function _safeResize(inst) {
    if (!inst) return;
    const dom = inst.getDom && inst.getDom();
    if (dom && dom.offsetParent !== null) inst.resize();
}

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // CSV Data (Embedded & Pre-parsed)
    // ==========================================
    const RAW_DATA = [
        { city: '基隆市', year: 110, type: '港區', count: 1 },
        { city: '臺北市', year: 109, type: '觀光區', count: 6 },
        { city: '臺北市', year: 109, type: '車輛高密度區(轉運站)', count: 3 },
        { city: '臺北市', year: 110, type: '機場', count: 1 },
        { city: '臺北市', year: 110, type: '車輛高密度區(焚化廠/資源回收廠)', count: 3 },
        { city: '臺北市', year: 112, type: '車輛高密度區(一般道路)', count: 1 },
        { city: '臺北市', year: 113, type: '車輛高密度區(一般道路)', count: 3 },
        { city: '臺北市', year: 114, type: '車輛高密度區(一般道路)', count: 1 },
        { city: '新北市', year: 109, type: '港區', count: 1 },
        { city: '新北市', year: 110, type: '車輛高密度區(轉運站)', count: 1 },
        { city: '新北市', year: 114, type: '車輛高密度區(焚化廠/資源回收廠)', count: 2 },
        { city: '桃園市', year: 110, type: '機場', count: 1 },
        { city: '桃園市', year: 111, type: '車輛高密度區(工業區)', count: 1 },
        { city: '桃園市', year: 111, type: '車輛高密度區(物流園區)', count: 1 },
        { city: '桃園市', year: 111, type: '敏弱族群(醫療院所)', count: 1 },
        { city: '桃園市', year: 112, type: '車輛高密度區(一般道路)', count: 1 },
        { city: '新竹市', year: 110, type: '車輛高密度區(轉運站)', count: 1 },
        { city: '新竹市', year: 111, type: '敏弱族群(國中以下學校)', count: 1 },
        { city: '新竹市', year: 112, type: '車輛高密度區(工業區)', count: 1 },
        { city: '新竹市', year: 113, type: '敏弱族群(醫療院所)', count: 1 },
        { city: '新竹市', year: 114, type: '車輛高密度區(一般道路)', count: 1 },
        { city: '新竹縣', year: 110, type: '觀光區', count: 1 },
        { city: '新竹縣', year: 111, type: '車輛高密度區(工業區)', count: 1 },
        { city: '新竹縣', year: 112, type: '車輛高密度區(工業區)', count: 1 },
        { city: '苗栗縣', year: 111, type: '車輛高密度區(工業區)', count: 1 },
        { city: '苗栗縣', year: 112, type: '敏弱族群(國中以下學校)', count: 1 },
        { city: '苗栗縣', year: 113, type: '車輛高密度區(工業區)', count: 1 },
        { city: '苗栗縣', year: 114, type: '敏弱族群(國中以下學校)', count: 1 },
        { city: '臺中市', year: 110, type: '港區', count: 1 },
        { city: '臺中市', year: 113, type: '觀光區', count: 3 },
        { city: '彰化縣', year: 111, type: '敏弱族群(醫療院所)', count: 1 },
        { city: '彰化縣', year: 112, type: '敏弱族群(醫療院所)', count: 1 },
        { city: '彰化縣', year: 113, type: '其他', count: 1 },
        { city: '彰化縣', year: 114, type: '車輛高密度區(工業區)', count: 1 },
        { city: '南投縣', year: 112, type: '觀光區', count: 1 },
        { city: '雲林縣', year: 110, type: '敏弱族群(國中以下學校)', count: 1 },
        { city: '雲林縣', year: 111, type: '車輛高密度區(工業區)', count: 2 },
        { city: '雲林縣', year: 112, type: '敏弱族群(國中以下學校)', count: 1 },
        { city: '雲林縣', year: 112, type: '敏弱族群(醫療院所)', count: 1 },
        { city: '雲林縣', year: 113, type: '敏弱族群(國中以下學校)', count: 1 },
        { city: '嘉義市', year: 110, type: '車輛高密度區(轉運站)', count: 1 },
        { city: '嘉義市', year: 111, type: '觀光區', count: 1 },
        { city: '嘉義縣', year: 110, type: '觀光區', count: 1 },
        { city: '嘉義縣', year: 112, type: '觀光區', count: 2 },
        { city: '嘉義縣', year: 113, type: '車輛高密度區(焚化廠/資源回收廠)', count: 1 },
        { city: '臺南市', year: 110, type: '觀光區', count: 1 },
        { city: '臺南市', year: 112, type: '港區', count: 1 },
        { city: '臺南市', year: 112, type: '敏弱族群(醫療院所)', count: 1 },
        { city: '臺南市', year: 114, type: '車輛高密度區(工業區)', count: 2 },
        { city: '高雄市', year: 110, type: '觀光區', count: 3 },
        { city: '高雄市', year: 111, type: '港區', count: 1 },
        { city: '高雄市', year: 113, type: '觀光區', count: 4 },
        { city: '高雄市', year: 113, type: '敏弱族群(國中以下學校)', count: 1 },
        { city: '高雄市', year: 114, type: '機場', count: 1 },
        { city: '高雄市', year: 114, type: '車輛高密度區(焚化廠/資源回收廠)', count: 4 },
        { city: '高雄市', year: 114, type: '車輛高密度區(停車場)', count: 2 },
        { city: '屏東縣', year: 110, type: '觀光區', count: 1 },
        { city: '屏東縣', year: 112, type: '車輛高密度區(工業區)', count: 1 },
        { city: '屏東縣', year: 113, type: '敏弱族群(國中以下學校)', count: 2 },
        { city: '屏東縣', year: 114, type: '敏弱族群(國中以下學校)', count: 1 },
        { city: '宜蘭縣', year: 111, type: '港區', count: 1 },
        { city: '宜蘭縣', year: 112, type: '敏弱族群(醫療院所)', count: 1 },
        { city: '宜蘭縣', year: 113, type: '車輛高密度區(轉運站)', count: 1 },
        { city: '花蓮縣', year: 110, type: '敏弱族群(國中以下學校)', count: 1 },
        { city: '花蓮縣', year: 112, type: '觀光區', count: 1 },
        { city: '花蓮縣', year: 112, type: '敏弱族群(國中以下學校)', count: 1 },
        { city: '花蓮縣', year: 113, type: '港區', count: 1 },
        { city: '臺東縣', year: 110, type: '觀光區', count: 1 },
        { city: '臺東縣', year: 112, type: '觀光區', count: 1 },
        { city: '臺東縣', year: 112, type: '車輛高密度區(轉運站)', count: 1 },
        { city: '臺東縣', year: 113, type: '觀光區', count: 1 },
        { city: '臺東縣', year: 114, type: '車輛高密度區(一般道路)', count: 1 },
        { city: '金門縣', year: 111, type: '觀光區', count: 1 },
        { city: '金門縣', year: 112, type: '觀光區', count: 1 },
        { city: '澎湖縣', year: 113, type: '機場', count: 1 },
    ];

    // ==========================================
    // Category Mapping (主類別)
    // ==========================================
    const CATEGORY_MAP = {
        '港區': '交通與物流樞紐',
        '機場': '交通與物流樞紐',
        '車輛高密度區(轉運站)': '交通與物流樞紐',
        '車輛高密度區(物流園區)': '交通與物流樞紐',
        '車輛高密度區(一般道路)': '交通與物流樞紐',
        '車輛高密度區(停車場)': '交通與物流樞紐',
        '觀光區': '觀光與遊憩',
        '敏弱族群(國中以下學校)': '敏弱族群保護',
        '敏弱族群(醫療院所)': '敏弱族群保護',
        '車輛高密度區(工業區)': '工業與環保設施',
        '車輛高密度區(焚化廠/資源回收廠)': '工業與環保設施',
        '其他': '其他',
    };

    const CATEGORY_COLORS = {
        '交通與物流樞紐': { bg: 'rgba(56, 189, 248, 0.8)', border: '#38bdf8' },
        '觀光與遊憩': { bg: 'rgba(251, 191, 36, 0.8)', border: '#fbbf24' },
        '敏弱族群保護': { bg: 'rgba(244, 114, 182, 0.8)', border: '#f472b6' },
        '工業與環保設施': { bg: 'rgba(148, 163, 184, 0.8)', border: '#94a3b8' },
        '其他': { bg: 'rgba(167, 139, 250, 0.8)', border: '#a78bfa' },
    };

    const YEARS = [109, 110, 111, 112, 113, 114];
    const CATEGORIES = Object.keys(CATEGORY_COLORS);

    // ==========================================
    // Data Helper Functions
    // ==========================================
    function getCategory(type) {
        return CATEGORY_MAP[type] || '其他';
    }

    function filterData(yearFilter = 'all', cityFilter = 'all') {
        return RAW_DATA.filter(d => {
            if (yearFilter !== 'all' && d.year !== parseInt(yearFilter)) return false;
            if (cityFilter !== 'all' && d.city !== cityFilter) return false;
            return true;
        });
    }

    function getCityTotals(data) {
        const totals = {};
        data.forEach(d => {
            totals[d.city] = (totals[d.city] || 0) + d.count;
        });
        return Object.entries(totals).sort((a, b) => b[1] - a[1]);
    }

    function getCategoryTotals(data) {
        const totals = {};
        data.forEach(d => {
            const cat = getCategory(d.type);
            totals[cat] = (totals[cat] || 0) + d.count;
        });
        return totals;
    }

    function getTypeTotals(data) {
        const totals = {};
        data.forEach(d => {
            totals[d.type] = (totals[d.type] || 0) + d.count;
        });
        return Object.entries(totals).sort((a, b) => b[1] - a[1]);
    }

    function getYearlyCategoryData(data) {
        const result = {};
        YEARS.forEach(y => {
            result[y] = {};
            CATEGORIES.forEach(c => result[y][c] = 0);
        });
        data.forEach(d => {
            const cat = getCategory(d.type);
            if (result[d.year]) {
                result[d.year][cat] += d.count;
            }
        });
        return result;
    }

    // ==========================================
    // 1. Tooltips
    // ==========================================
    tippy('.tooltip-target', {
        theme: 'tech',
        placement: 'top',
        arrow: true,
        animation: 'shift-away'
    });

    // ==========================================
    // 3. Mobile Menu Toggle
    // ==========================================
    const menuToggle = document.getElementById('menu-toggle');
    const mainNavUl = document.querySelector('#main-nav ul');
    if (menuToggle && mainNavUl) {
        menuToggle.addEventListener('click', () => {
            const isOpen = mainNavUl.classList.toggle('show');
            menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
    }

    // ==========================================
    // 4. Header Scroll & Scroll Top
    // ==========================================
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        const scrollTopBtn = document.getElementById('scroll-top');
        if (scrollTopBtn) {
            scrollTopBtn.classList.toggle('show', window.scrollY > 300);
        }
    });

    const scrollTopBtn = document.getElementById('scroll-top');
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ==========================================
    // 5. Tab Switching Logic (6 tabs)
    // ==========================================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Guards: each tab's dashboard should only do its heavy init() once per page load.
    // Subsequent clicks just reveal the already-built DOM & charts (ECharts handles resize).
    let mobileDashboardInitialized = false;
    let noiseDashboardInitialized = false;
    let fugitiveDashboardInitialized = false;
    let fixedDashboardInitialized = false;
    let promoDashboardInitialized = false;

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => {
                b.classList.remove('active', 'text-white', 'shadow-md', 'transform', '-translate-y-1');
                b.classList.add('bg-white/80', 'text-slate-500', 'hover:bg-slate-50', 'hover:text-brand');
                b.style.backgroundColor = '';
                if (b.hasAttribute('role')) b.setAttribute('aria-selected', 'false');
            });
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active', 'text-white', 'shadow-md', 'transform', '-translate-y-1');
            btn.classList.remove('bg-white/80', 'text-slate-500', 'hover:bg-slate-50', 'hover:text-brand');
            if (btn.hasAttribute('role')) btn.setAttribute('aria-selected', 'true');

            const targetId = btn.getAttribute('data-tab');
            const _tabEl = document.getElementById(targetId);
            // First visit → play entrance animation; return visit → show instantly (no floatUp restart)
            if (_tabEl.dataset.visited) {
                _tabEl.style.setProperty('animation', 'none');
                _tabEl.style.setProperty('transition', 'none');
            } else {
                _tabEl.style.removeProperty('animation');
                _tabEl.style.removeProperty('transition');
                _tabEl.dataset.visited = '1';
            }
            _tabEl.classList.add('active');

            // 延遲初始化各儀表板（single rAF 確保 display:block 後 ECharts 可計算容器尺寸）
            if (targetId === 'mobile-source' && !mobileDashboardInitialized) {
                mobileDashboardInitialized = true;
                requestAnimationFrame(() => { initMobileDashboard(); });
            }

            if (targetId === 'noise-source' && !noiseDashboardInitialized) {
                noiseDashboardInitialized = true;
                requestAnimationFrame(() => { initNoiseDashboard(); });
            }

            if (targetId === 'fugitive-source') {
                requestAnimationFrame(() => {
                    if (!fugitiveDashboardInitialized) {
                        fugitiveDashboardInitialized = true;
                        initFugitiveDashboard();
                    }
                    // Re-measure all fugitive charts in case window was resized while this tab was hidden
                    ['chart-fug2-choropleth', 'chart-fug2-top5', 'chart-fug2-shore-map',
                     'chart-fug2-donut', 'chart-fug2-stacked', 'chart-fug2-catering'].forEach(id => {
                        const el = document.getElementById(id);
                        const inst = el && echarts.getInstanceByDom(el);
                        if (inst) inst.resize();
                    });
                });
            }

            if (targetId === 'fixed-source' && !fixedDashboardInitialized) {
                fixedDashboardInitialized = true;
                requestAnimationFrame(() => { initFixedDashboard(); });
            }

            if (targetId === 'promo-source' && !promoDashboardInitialized) {
                promoDashboardInitialized = true;
                requestAnimationFrame(() => { initPromoDashboard(); });
            }
        });
    });

    // ==========================================
    // 6. Animated Counters
    // ==========================================
    const animateCounters = () => {
        const counters = document.querySelectorAll('.counter');
        counters.forEach(counter => {
            let currentValue = 0;
            const target = +counter.getAttribute('data-target');
            if (!target) return;

            const updateCount = () => {
                const inc = target / 80;
                if (currentValue < target) {
                    currentValue += inc;
                    if (currentValue > target) currentValue = target;
                    counter.innerText = target > 999 ? Math.floor(currentValue).toLocaleString() : Math.floor(currentValue);
                    setTimeout(updateCount, 20);
                } else {
                    counter.innerText = target > 999 ? target.toLocaleString() : target;
                }
            };

            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    updateCount();
                    observer.disconnect();
                }
            });
            observer.observe(counter);
        });
    };
    animateCounters();

    // ==========================================
    // 7. Scroll Animations
    // ==========================================
    const initScrollAnimations = () => {
        const animatedElements = document.querySelectorAll('.scroll-animate');
        const scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('show');
                    scrollObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
        animatedElements.forEach(el => scrollObserver.observe(el));
    };
    initScrollAnimations();

    // ==========================================
    // 8. Radar Sweep (Hero) — Low-frequency timer + IntersectionObserver
    // ==========================================
    const initRadarSweep = () => {
        const stationNodes = document.querySelectorAll('.station-node');
        if (!stationNodes.length) return;

        const heroSection = document.querySelector('section'); // Hero section
        const heroStationText = document.getElementById('hero-station-text');
        const heroAqiValue = document.getElementById('hero-aqi-value');
        const heroAqiStatus = document.getElementById('hero-aqi-status');
        const heroIcon = document.getElementById('hero-station-icon');
        const heroRing = document.getElementById('hero-aqi-ring');
        const heroCore = document.getElementById('hero-core-glow');
        const heroPm25Display = document.getElementById('hero-pm25-value');
        const heroO3Display = document.getElementById('hero-o3-value');
        const radarSweepArm = document.getElementById('radar-sweep-arm');

        // AQI Color mapping based on official standards:
        // 良好(0-50)=綠, 普通(51-100)=黃, 對敏感族群不健康(101-150)=橘,
        // 對所有族群不健康(151-200)=紅, 非常不健康(201-300)=紫, 危害(301-400)=棕, 危害(401+)=深棕
        const getColorByAQI = (aqi) => {
            const num = parseInt(aqi);
            if (num <= 50) return 'green';        // 良好
            if (num <= 100) return 'yellow';      // 普通
            if (num <= 150) return 'orange';      // 對敏感族群不健康
            if (num <= 200) return 'red';         // 對所有族群不健康
            if (num <= 300) return 'purple';      // 非常不健康
            if (num <= 400) return 'brown';       // 危害
            return 'darkbrown';                   // 危害 (401+)
        };

        const colorStyles = {
            'green': { text: 'text-green-600', bg: 'bg-green-50', shadow: 'shadow-[0_0_10px_rgba(34,197,94,0.25)]', stroke: '#22c55e', glow: 'from-green-300/20 to-emerald-200/10' },
            'yellow': { text: 'text-amber-600', bg: 'bg-amber-50', shadow: 'shadow-[0_0_10px_rgba(245,158,11,0.25)]', stroke: '#f59e0b', glow: 'from-amber-200/20 to-orange-100/10' },
            'orange': { text: 'text-orange-600', bg: 'bg-orange-50', shadow: 'shadow-[0_0_10px_rgba(249,115,22,0.25)]', stroke: '#f97316', glow: 'from-orange-200/20 to-red-100/10' },
            'red': { text: 'text-red-600', bg: 'bg-red-50', shadow: 'shadow-[0_0_10px_rgba(220,38,38,0.25)]', stroke: '#dc2626', glow: 'from-red-300/20 to-rose-200/10' },
            'purple': { text: 'text-purple-600', bg: 'bg-purple-50', shadow: 'shadow-[0_0_10px_rgba(147,51,234,0.25)]', stroke: '#9333ea', glow: 'from-purple-300/20 to-violet-200/10' },
            'brown': { text: 'text-amber-800', bg: 'bg-amber-100', shadow: 'shadow-[0_0_10px_rgba(146,64,14,0.25)]', stroke: '#92400e', glow: 'from-amber-300/20 to-yellow-200/10' },
            'darkbrown': { text: 'text-amber-900', bg: 'bg-amber-200', shadow: 'shadow-[0_0_10px_rgba(120,53,15,0.25)]', stroke: '#78350f', glow: 'from-amber-400/20 to-orange-300/10' }
        };

        let lastActiveStation = null;
        let sweepInterval = null;
        const sweepDuration = 6000; // 6秒完成一圈
        const detectionRange = 12; // 检测范围 ±12度：光线到达测站时才切换

        const sweepStep = () => {
            if (!radarSweepArm) return;

            // 绝对时间同步，与CSS animation完全对齐
            const now = Date.now();
            const currentAngle = ((now % sweepDuration) / sweepDuration) * 360;

            // 找到距离光线最近的测站
            let closestStation = null;
            let closestDistance = Infinity;

            stationNodes.forEach(node => {
                const nodeAngle = parseInt(node.getAttribute('data-angle'));
                let diff = Math.abs(currentAngle - nodeAngle);
                if (diff > 180) diff = 360 - diff;
                if (diff < closestDistance) {
                    closestDistance = diff;
                    closestStation = { node, distance: diff };
                }
            });

            // 光线到达测站（±12度内）才切换数据
            if (closestStation && closestStation.distance <= detectionRange) {
                if (lastActiveStation !== closestStation.node) {
                    lastActiveStation = closestStation.node;
                    const node = closestStation.node;

                    // 重置所有点位样式
                    stationNodes.forEach(n => {
                        n.classList.remove('scale-[2]', 'z-30');
                        n.style.removeProperty('background-color');
                        n.style.removeProperty('border-color');
                        n.style.removeProperty('box-shadow');
                    });

                    // 选中点位：放大 + 颜色突出 + 双层光晕
                    const aqiValue = node.getAttribute('data-aqi');
                    const colorMode = getColorByAQI(aqiValue);
                    const styles = colorStyles[colorMode] || colorStyles['green'];
                    node.classList.add('scale-[2]', 'z-30');
                    node.style.backgroundColor = styles.stroke;
                    node.style.borderColor = '#fff';
                    node.style.boxShadow = `0 0 0 3px ${styles.stroke}55, 0 0 14px ${styles.stroke}99`;

                    // 更新数据面板
                    heroStationText.innerText = node.getAttribute('data-station');
                    heroAqiValue.innerText = aqiValue;
                    heroAqiStatus.innerText = node.getAttribute('data-status');
                    if (heroPm25Display) heroPm25Display.innerText = node.getAttribute('data-pm25');
                    if (heroO3Display) heroO3Display.innerText = node.getAttribute('data-o3');

                    // 更新颜色（环常驻，不重置）
                    heroIcon.className = `fa-solid fa-location-dot transition-colors duration-300 ${styles.text}`;
                    heroAqiStatus.className = `mt-3 px-4 py-1.5 border rounded-full text-sm font-bold backdrop-blur-sm transition-colors duration-300 border-current ${styles.text} ${styles.bg} ${styles.shadow}`;
                    heroRing.setAttribute('stroke', styles.stroke);
                    heroCore.className = `absolute inset-4 rounded-full bg-gradient-to-tr blur-md transition-colors duration-300 ${styles.glow}`;
                }
            }
        };

        // 只在hero可见时运行
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !sweepInterval) {
                sweepStep(); // 立即执行一次
                sweepInterval = setInterval(sweepStep, 50); // 50ms的检测频率确保精确捕捉
            } else if (!entries[0].isIntersecting && sweepInterval) {
                clearInterval(sweepInterval);
                sweepInterval = null;
            }
        }, { threshold: 0.1 });

        if (heroSection) observer.observe(heroSection);

        // 页面加载时如果hero已可见，立即启动
        if (heroSection && heroSection.offsetParent !== null) {
            sweepStep();
            sweepInterval = setInterval(sweepStep, 50);
        }
    };
    initRadarSweep();

    // ==========================================
    // 9. Air Zone Dashboard (空維區核定)
    // ==========================================
    const initAirZoneDashboard = () => {
        const yearFilter = document.getElementById('airzone-filter-year');
        const cityFilter = document.getElementById('airzone-filter-city');

        // Populate city dropdown
        const allCities = [...new Set(RAW_DATA.map(d => d.city))];
        allCities.forEach(city => {
            const opt = document.createElement('option');
            opt.value = city;
            opt.textContent = city;
            cityFilter.appendChild(opt);
        });

        // Shared ECharts tooltip style
        const ecTooltipBase = {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: 'rgba(56, 189, 248, 0.4)',
            borderWidth: 1,
            textStyle: { color: '#f8fafc', fontFamily: 'Noto Sans TC' },
            padding: 12,
            extraCssText: 'border-radius:10px;'
        };
        const ecAxisFont = { fontFamily: 'Noto Sans TC', color: '#475569' };

        // Chart instances
        let trendChart, leaderboardChart, donutChart, echartsMap;

        // ---- A. ECharts Taiwan Map ----
        const initMap = () => {
            const mapContainer = document.getElementById('map-container');
            if (!mapContainer) return;

            echartsMap = echarts.init(mapContainer);

            // Use shared GeoJSON promise (no duplicate network requests)
            _geoJsonPromise
                .then(() => { updateMap(filterData()); })
                .catch(err => {
                    console.error('Failed to load Taiwan GeoJSON:', err);
                    const errEl = document.createElement('div');
                    errEl.className = 'flex items-center justify-center h-full text-slate-400';
                    errEl.textContent = '地圖載入失敗';
                    mapContainer.replaceChildren(errEl);
                });
        };

        const updateMap = (data) => {
            if (!echartsMap) return;

            const cityTotals = getCityTotals(data);
            const mapData = cityTotals.map(([city, total]) => ({ name: city, value: total }));

            const option = {
                tooltip: {
                    trigger: 'item',
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(56, 189, 248, 0.5)',
                    borderWidth: 1,
                    textStyle: { color: '#f8fafc', fontFamily: 'Noto Sans TC' },
                    formatter: (params) => {
                        if (params.value) {
                            return `<strong>${params.name}</strong><br/>共核定 <span style="color:#38bdf8;font-size:18px;font-weight:800">${params.value}</span> 處空維區`;
                        }
                        return `<strong>${params.name}</strong><br/>尚未劃設空維區`;
                    }
                },
                visualMap: {
                    min: 0,
                    max: Math.max(...mapData.map(d => d.value), 1),
                    left: 'left',
                    top: 'bottom',
                    text: ['多', '少'],
                    textStyle: { color: '#64748b', fontFamily: 'Noto Sans TC' },
                    inRange: {
                        color: ['#e0f2fe', '#7dd3fc', '#38bdf8', '#0284c7', '#075985']
                    },
                    calculable: true
                },
                series: [{
                    name: '空維區核定數量',
                    type: 'map',
                    map: 'Taiwan',
                    roam: true,
                    center: [120.898878, 23.6521737],
                    zoom: 1.35,
                    aspectScale: 0.85,
                    layoutCenter: ['50%', '50%'],
                    layoutSize: '120%',
                    label: {
                        show: true,
                        fontSize: 10,
                        color: '#475569',
                        fontFamily: 'Noto Sans TC'
                    },
                    emphasis: {
                        label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
                        itemStyle: { areaColor: '#fbbf24', shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.3)' }
                    },
                    itemStyle: {
                        borderColor: '#fff',
                        borderWidth: 1.5,
                        areaColor: '#f1f5f9'
                    },
                    data: mapData
                }]
            };

            echartsMap.setOption(option);

            // Click to filter by city
            echartsMap.off('click');
            echartsMap.on('click', (params) => {
                if (params.name) {
                    const citySelect = document.getElementById('airzone-filter-city');
                    const matchingOption = [...citySelect.options].find(opt => opt.value === params.name);
                    if (matchingOption) {
                        citySelect.value = params.name;
                        updateAllCharts();
                    }
                }
            });
        };

        // ---- B. Trend Chart (Stacked Bar, ECharts) ----
        const initTrendChart = () => {
            const el = document.getElementById('chart-airzone-trend');
            if (!el) return;
            trendChart = echarts.init(el);
        };

        const updateTrendChart = (data) => {
            if (!trendChart) return;
            const yearlyCat = getYearlyCategoryData(data);
            const series = CATEGORIES.map(cat => ({
                name: cat,
                type: 'bar',
                stack: 'total',
                emphasis: { focus: 'series' },
                itemStyle: {
                    color: CATEGORY_COLORS[cat].bg,
                    borderColor: CATEGORY_COLORS[cat].border,
                    borderWidth: 1,
                    borderRadius: [4, 4, 0, 0]
                },
                data: YEARS.map(y => yearlyCat[y][cat])
            }));
            trendChart.setOption({
                title: {
                    text: '各年度新增核定空維區數量（依主類別堆疊）',
                    left: 'center', top: 6,
                    textStyle: { fontFamily: 'Noto Sans TC', fontSize: 14, fontWeight: 'bold', color: '#334155' }
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    ...ecTooltipBase,
                    formatter: (params) => {
                        const header = `<div style="font-weight:700;margin-bottom:4px">${params[0].axisValue}</div>`;
                        const rows = params.filter(p => p.value > 0).map(p =>
                            `<div>${p.marker}${p.seriesName}：<b>${p.value}</b> 處</div>`).join('');
                        return header + rows;
                    }
                },
                legend: {
                    bottom: 0,
                    textStyle: { fontFamily: 'Noto Sans TC', fontSize: 12, color: '#475569' },
                    itemWidth: 14, itemHeight: 10
                },
                grid: { left: 60, right: 20, top: 50, bottom: 70, containLabel: true },
                xAxis: {
                    type: 'category',
                    data: YEARS.map(y => `${y}年`),
                    axisLine: { lineStyle: { color: '#cbd5e1' } },
                    axisTick: { show: false },
                    axisLabel: ecAxisFont
                },
                yAxis: {
                    type: 'value',
                    name: '核定數量 (處)',
                    nameTextStyle: { fontFamily: 'Noto Sans TC', color: '#64748b' },
                    splitLine: { lineStyle: { color: '#f1f5f9' } },
                    axisLabel: ecAxisFont
                },
                series
            }, true);
        };

        // ---- C. Leaderboard Chart (Horizontal Bar, ECharts) ----
        const initLeaderboardChart = () => {
            const el = document.getElementById('chart-airzone-leaderboard');
            if (!el) return;
            leaderboardChart = echarts.init(el);
        };

        const updateLeaderboardChart = (data) => {
            if (!leaderboardChart) return;
            const cityTotals = getCityTotals(data);
            const labels = cityTotals.map(([c]) => c);
            const values = cityTotals.map(([, v]) => v);
            const n = cityTotals.length || 1;
            const colors = cityTotals.map((_, i) => {
                const ratio = 1 - (i / n);
                return `rgba(2, 132, 199, ${0.3 + ratio * 0.6})`;
            });
            leaderboardChart.setOption({
                title: {
                    text: '各縣市空維區核定數量排行',
                    left: 'center', top: 6,
                    textStyle: { fontFamily: 'Noto Sans TC', fontSize: 14, fontWeight: 'bold', color: '#334155' }
                },
                tooltip: {
                    trigger: 'item',
                    ...ecTooltipBase,
                    formatter: (p) => `<b>${p.name}</b><br/>共核定 <b>${p.value}</b> 處空維區`
                },
                grid: { left: 10, right: 30, top: 50, bottom: 40, containLabel: true },
                xAxis: {
                    type: 'value',
                    name: '核定數量 (處)',
                    nameTextStyle: { fontFamily: 'Noto Sans TC', color: '#64748b' },
                    splitLine: { lineStyle: { color: '#f1f5f9' } },
                    axisLabel: ecAxisFont
                },
                yAxis: {
                    type: 'category',
                    data: [...labels].reverse(),
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: { ...ecAxisFont, fontSize: 12, fontWeight: 'bold', color: '#334155' }
                },
                series: [{
                    type: 'bar',
                    data: [...values].reverse().map((v, i) => ({
                        value: v,
                        itemStyle: {
                            color: [...colors].reverse()[i],
                            borderColor: '#0284c7',
                            borderWidth: 1,
                            borderRadius: [0, 6, 6, 0]
                        }
                    })),
                    barMaxWidth: 22
                }]
            }, true);
        };

        // ---- D. Donut Chart (ECharts) ----
        const initDonutChart = () => {
            const el = document.getElementById('chart-airzone-donut');
            if (!el) return;
            donutChart = echarts.init(el);
        };

        const updateDonutChart = (data) => {
            if (!donutChart) return;
            const catTotals = getCategoryTotals(data);
            const labels = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);
            const items = labels.map(l => ({
                name: l,
                value: catTotals[l],
                itemStyle: { color: CATEGORY_COLORS[l]?.bg || 'rgba(148,163,184,0.8)' }
            }));
            const total = items.reduce((s, d) => s + d.value, 0) || 1;
            donutChart.setOption({
                title: {
                    text: '空維區保護類型佔比分析',
                    left: 'center', top: 6,
                    textStyle: { fontFamily: 'Noto Sans TC', fontSize: 14, fontWeight: 'bold', color: '#334155' }
                },
                tooltip: {
                    trigger: 'item',
                    ...ecTooltipBase,
                    formatter: (p) => {
                        const pct = ((p.value / total) * 100).toFixed(1);
                        return ` ${p.name}：<b>${p.value}</b> 處 (${pct}%)`;
                    }
                },
                legend: {
                    bottom: 0,
                    textStyle: { fontFamily: 'Noto Sans TC', fontSize: 13, color: '#475569' },
                    icon: 'circle', itemWidth: 12, itemHeight: 12, itemGap: 18
                },
                series: [{
                    name: '保護類型',
                    type: 'pie',
                    radius: ['45%', '70%'],
                    center: ['50%', '50%'],
                    avoidLabelOverlap: true,
                    itemStyle: { borderColor: '#fff', borderWidth: 3 },
                    label: { show: false },
                    emphasis: {
                        scale: true, scaleSize: 8,
                        label: { show: false }
                    },
                    data: items
                }]
            }, true);
        };

        // ---- E. KPI Updates ----
        const updateKPIs = (data) => {
            const total = data.reduce((s, d) => s + d.count, 0);
            const cities = new Set(data.map(d => d.city));
            const typeTotals = getTypeTotals(data);
            const topType = typeTotals.length > 0 ? typeTotals[0] : ['—', 0];

            const kpiTotal = document.getElementById('kpi-total-zones');
            const kpiCities = document.getElementById('kpi-city-count');
            const kpiTopType = document.getElementById('kpi-top-type');
            const kpiTopCount = document.getElementById('kpi-top-type-count');

            if (kpiTotal) { kpiTotal.setAttribute('data-target', total); kpiTotal.innerText = total; }
            if (kpiCities) { kpiCities.setAttribute('data-target', cities.size); kpiCities.innerText = cities.size; }
            if (kpiTopType) kpiTopType.innerText = topType[0];
            if (kpiTopCount) kpiTopCount.innerText = topType[1];
        };

        // ---- Master Update ----
        const updateAllCharts = () => {
            const y = yearFilter.value;
            const c = cityFilter.value;
            const data = filterData(y, c);

            updateKPIs(data);
            updateMap(data);
            updateTrendChart(data);
            updateLeaderboardChart(data);
            updateDonutChart(data);
        };

        // Init all
        initMap();
        initTrendChart();
        initLeaderboardChart();
        initDonutChart();

        // First render
        const initialData = filterData();
        updateKPIs(initialData);
        updateTrendChart(initialData);
        updateLeaderboardChart(initialData);
        updateDonutChart(initialData);

        // Listeners
        yearFilter.addEventListener('change', updateAllCharts);
        cityFilter.addEventListener('change', updateAllCharts);

        // Handle map resize (uses shared debounced dispatcher)
        _resizeHandlers.add(() => {
            if (echartsMap) _safeResize(echartsMap);
            if (trendChart) _safeResize(trendChart);
            if (leaderboardChart) _safeResize(leaderboardChart);
            if (donutChart) _safeResize(donutChart);
        });
    };

    initAirZoneDashboard();

    // =========================================================================
    // Tab 3: Mobile Source Management Dashboard
    // =========================================================================
    const initMobileDashboard = () => {
        const data = window.mobileData;
        if (!data) return;

        // --- Module 1: Two-Stroke Scooter Phase-out (Gradient Area) ---
        const initTwoStroke = () => {
            const chartEl = document.getElementById('chart-mobile-2stroke');
            // 銷毀舊實例，確保乾淨重新初始化
            const oldChart = echarts.getInstanceByDom(chartEl);
            if (oldChart) oldChart.dispose();
            const chart = echarts.init(chartEl);
            const TWO_STROKE_108_BASE = 62.6894;   // 108年 剩餘總數（萬輛）
            const TWO_STROKE_115_END  = 22.8296;   // 115年2月 剩餘總數（萬輛）
            const reductionPct = (((TWO_STROKE_108_BASE - TWO_STROKE_115_END) / TWO_STROKE_108_BASE) * 100).toFixed(1);
            const option = {
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(16, 185, 129, 0.5)',
                    textStyle: { color: '#f8fafc', fontFamily: 'Noto Sans TC' },
                    formatter: params => {
                        const p = params[0];
                        return `<strong>${p.axisValue}</strong><br/>剩餘總數：${p.value} 萬輛`;
                    }
                },
                grid: { top: 20, right: 20, bottom: 40, left: 45, containLabel: true },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: data.twoStroke.years,
                    axisLabel: { color: '#64748b', fontSize: 11 },
                    axisLine: { lineStyle: { color: '#cbd5e1' } }
                },
                yAxis: {
                    type: 'value',
                    name: '萬輛',
                    min: 15,
                    nameTextStyle: { color: '#64748b', align: 'right', padding: [0, 0, 5, 0], fontSize: 11 },
                    axisLabel: { color: '#64748b' },
                    splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
                },
                series: [{
                    name: '剩餘總數',
                    type: 'line',
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 10,
                    lineStyle: { color: '#10b981', width: 3 },
                    itemStyle: { color: '#10b981', borderColor: '#fff', borderWidth: 2 },
                    label: { show: true, position: 'top', color: '#475569', fontSize: 11, fontWeight: 'bold', formatter: p => (+p.value).toFixed(1) + '萬' },
                    areaStyle: {
                        // 深灰→翠綠漸層，象徵污染逐漸散去
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0,   color: 'rgba(71, 85, 105, 0.55)' },  // slate-600 深灰（高污染起點）
                            { offset: 0.5, color: 'rgba(52, 211, 153, 0.25)' }, // emerald 中段
                            { offset: 1,   color: 'rgba(16, 185, 129, 0.04)' }  // 翠綠淡出
                        ])
                    },
                    markPoint: {
                        symbol: 'pin',
                        symbolSize: [56, 48],
                        label: { fontSize: 10, fontWeight: 'bold', color: '#fff', lineHeight: 14 },
                        data: [
                            { name: '108年起點', xAxis: '108年', yAxis: TWO_STROKE_108_BASE, value: '62.7萬', itemStyle: { color: '#475569' } },
                            { name: '115年2月終點', xAxis: '115年2月', yAxis: TWO_STROKE_115_END, value: '22.8萬', itemStyle: { color: '#059669' } }
                        ]
                    },
                    data: data.twoStroke.counts
                }]
            };
            chart.setOption(option);
        };

        // --- Module 2: Fuel Scooter Structures (100% Stacked Bar - percentage mode) ---
        const initScooterPhases = () => {
            const chart = echarts.init(document.getElementById('chart-mobile-phases'));

            const years = data.scooterPhases.data.map(d => d.year);

            // Compute percentage for each period per year
            const pct = (val, total) => +((val / total) * 100).toFixed(2);

            // Series config per planning doc colour spec:
            //   1-3期 = 紅/深灰（高污染）  4-5期 = 橘/黃（過渡）  6-7期 = 亮綠/藍（低污染）
            const seriesConfig = [
                { key: 'p13', name: '一至三期（高污染）', color: '#dc2626' }, // Red
                { key: 'p4',  name: '四期',               color: '#f97316' }, // Orange
                { key: 'p5',  name: '五期',               color: '#eab308' }, // Yellow
                { key: 'p6',  name: '六期',               color: '#22c55e' }, // Green
                { key: 'p7',  name: '七期（低污染）',     color: '#10b981' }  // Emerald
            ];

            const seriesData = seriesConfig.map(cfg => ({
                name: cfg.name,
                type: 'bar',
                stack: 'total',
                barMaxWidth: 64,
                itemStyle: { color: cfg.color },
                emphasis: { focus: 'series' },
                label: {
                    show: true,
                    position: 'inside',
                    formatter: p => p.value >= 4 ? p.value + '%' : '',
                    fontSize: 12,
                    color: '#fff',
                    fontWeight: 'bold'
                },
                data: data.scooterPhases.data.map(d => pct(d[cfg.key], d.total))
            }));

            const option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(99, 102, 241, 0.5)',
                    textStyle: { color: '#f8fafc', fontFamily: 'Noto Sans TC', fontSize: 12 },
                    formatter: params => {
                        let html = `<strong>${params[0].axisValue}</strong><br/>`;
                        params.forEach(p => {
                            const raw = data.scooterPhases.data.find(d => d.year === p.axisValue);
                            const rawVal = raw ? raw[seriesConfig.find(s => s.name === p.seriesName)?.key] : 0;
                            html += `${p.marker}${p.seriesName}：${p.value}%（${rawVal ? (rawVal / 10000).toFixed(1) + '萬輛' : '—'}）<br/>`;
                        });
                        return html;
                    }
                },
                legend: {
                    top: 0,
                    left: 'center',
                    itemWidth: 16,
                    itemHeight: 12,
                    textStyle: { color: '#64748b', fontSize: 12, fontFamily: 'Noto Sans TC' },
                    itemGap: 16
                },
                grid: { top: 35, right: 20, bottom: 40, left: 40, containLabel: true },
                xAxis: {
                    type: 'category',
                    data: years,
                    axisLabel: { color: '#64748b', fontSize: 11 },
                    axisLine: { lineStyle: { color: '#cbd5e1' } }
                },
                yAxis: {
                    type: 'value',
                    min: 0,
                    max: 100,
                    nameTextStyle: { color: '#64748b', fontSize: 11 },
                    axisLabel: { color: '#64748b', formatter: v => v + '%' },
                    splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
                },
                series: seriesData
            };
            chart.setOption(option);
        };

        // --- Module 3: Diesel Vehicle Phases (Donut + Timeline) ---
        const initDieselPhases = () => {
            const chart = echarts.init(document.getElementById('chart-mobile-diesel'));
            let currentType = 'large';

            const getOptions = (type) => {
                const dataset = data.diesel[type];
                const years = data.diesel.years;

                const baseOption = {
                    timeline: {
                        axisType: 'category',
                        data: years,
                        autoPlay: true,
                        playInterval: 3000,
                        bottom: 10,
                        lineStyle: { color: '#cbd5e1' },
                        label: { color: '#64748b', fontSize: 10 },
                        controlStyle: { color: '#6366f1', borderColor: '#6366f1' }
                    },
                    tooltip: {
                        trigger: 'item',
                        formatter: '{a} <br/>{b}: {c} ({d}%)',
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        textStyle: { color: '#f8fafc', fontSize: 12 }
                    },
                    legend: { show: false },
                    series: [
                        {
                            name: '高低污染佔比',
                            type: 'pie',
                            radius: [0, '40%'],
                            center: ['50%', '50%'],
                            itemStyle: { borderColor: '#fff', borderWidth: 2 },
                            label: { position: 'inner', fontSize: 10, color: '#fff' },
                            labelLayout: { hideOverlap: true }
                        },
                        {
                            name: '各期別佔比',
                            type: 'pie',
                            radius: ['48%', '70%'],
                            center: ['50%', '50%'],
                            avoidLabelOverlap: true,
                            minAngle: 15, // Ensure small slices are visible
                            itemStyle: { borderColor: '#fff', borderWidth: 2 },
                            label: {
                                formatter: '{b|{b}}\n{c|{c}}',
                                rich: {
                                    b: { color: '#475569', fontSize: 11, lineHeight: 15, align: 'center' },
                                    c: { color: '#6366f1', fontSize: 11, fontWeight: 'bold', align: 'center' }
                                }
                            },
                            labelLayout: { hideOverlap: true }
                        }
                    ]
                };

                const options = dataset.map(yearData => {
                    const highPollut = yearData.p1 + yearData.p2 + yearData.p3;
                    const lowPollut = yearData.p4 + yearData.p5 + yearData.p6;
                    return {
                        title: { 
                            text: yearData.year + (type === 'large' ? ' 柴油大車' : ' 柴油小車'), 
                            left: 'center', 
                            top: 0, 
                            textStyle: { color: '#334155', fontSize: 16 } 
                        },
                        series: [
                            {
                                data: [
                                    { value: highPollut, name: '1-3期(高污染)', itemStyle: { color: '#f87171' } },
                                    { value: lowPollut, name: '4-6期(低污染)', itemStyle: { color: '#34d399' } }
                                ]
                            },
                            {
                                data: [
                                    { value: yearData.p1, name: '一期', itemStyle: { color: '#991b1b' } },
                                    { value: yearData.p2, name: '二期', itemStyle: { color: '#b91c1c' } },
                                    { value: yearData.p3, name: '三期', itemStyle: { color: '#ef4444' } },
                                    { value: yearData.p4, name: '四期', itemStyle: { color: '#fbbf24' } },
                                    { value: yearData.p5, name: '五期', itemStyle: { color: '#10b981' } },
                                    { value: yearData.p6, name: '六期', itemStyle: { color: '#059669' } },
                                ]
                            }
                        ]
                    };
                });

                return { baseOption, options };
            };

            chart.setOption(initDieselPhases.opt = getOptions(currentType));

            // Button toggles
            const btnLarge = document.getElementById('btn-diesel-large');
            const btnSmall = document.getElementById('btn-diesel-small');

            btnLarge.addEventListener('click', () => {
                currentType = 'large';
                btnLarge.className = "px-4 py-1.5 text-sm font-bold rounded-md bg-white shadow text-indigo-700 transition-all";
                btnSmall.className = "px-4 py-1.5 text-sm font-bold rounded-md text-slate-500 hover:text-slate-700 transition-all";
                chart.setOption(getOptions(currentType), true);
            });

            btnSmall.addEventListener('click', () => {
                currentType = 'small';
                btnSmall.className = "px-4 py-1.5 text-sm font-bold rounded-md bg-white shadow text-indigo-700 transition-all";
                btnLarge.className = "px-4 py-1.5 text-sm font-bold rounded-md text-slate-500 hover:text-slate-700 transition-all";
                chart.setOption(getOptions(currentType), true);
            });
        };

        // --- Module 4: Subsidy Cases (Treemap & Stacked Bar Combo) ---
        const initSubsidy = () => {
            const chart = echarts.init(document.getElementById('chart-mobile-subsidy'));
            
            const option = {
                tooltip: {
                    trigger: 'item',
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    textStyle: { color: '#f8fafc', fontSize: 12 },
                    formatter: (params) => {
                        if (params.seriesType === 'treemap') {
                            return `<strong>${params.name}</strong><br/>${params.value.toLocaleString()} 件`;
                        } else if (params.seriesType === 'bar') {
                            return `<strong>${params.name}</strong><br/>${params.seriesName}: ${params.value.toLocaleString()} 件`;
                        }
                    }
                },
                grid: { top: 40, right: '50%', bottom: 50, left: 55, containLabel: true },
                xAxis: {
                    type: 'category',
                    data: ['112年', '113年', '114年'],
                    axisLabel: { color: '#64748b', fontSize: 11 },
                    axisLine: { lineStyle: { color: '#cbd5e1' } }
                },
                yAxis: {
                    type: 'value',
                    axisLabel: { color: '#64748b', formatter: v => (v/10000)+'萬' },
                    splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
                },
                legend: {
                    data: ['環境部補助', '開發單位媒合'],
                    top: 0, left: 'center',
                    textStyle: { color: '#475569', fontSize: 13, fontFamily: 'Noto Sans TC', fontWeight: '500' },
                    itemWidth: 18,
                    itemHeight: 13,
                    itemGap: 20
                },
                series: [
                    {
                        name: '環境部補助',
                        type: 'bar',
                        stack: 'subsidy',
                        barWidth: '50%',
                        itemStyle: { color: '#6366f1', borderRadius: [0, 0, 0, 0] },
                        data: [28836, 40325, 26209]
                    },
                    {
                        name: '開發單位媒合',
                        type: 'bar',
                        stack: 'subsidy',
                        barWidth: '50%',
                        itemStyle: { color: '#f43f5e', borderRadius: [4, 4, 0, 0] },
                        data: [1285, 7400, 6397]
                    },
                    {
                        name: '車種分佈',
                        type: 'treemap',
                        left: '55%',
                        right: '5%',
                        top: 50,
                        bottom: 55,
                        roam: false,
                        nodeClick: false,
                        breadcrumb: { show: false },
                        itemStyle: { borderColor: '#fff', borderWidth: 2 },
                        levels: [{
                            itemStyle: { borderWidth: 2, borderColor: '#fff' },
                            upperLabel: { show: false }
                        }],
                        color: ['#818cf8', '#34d399', '#fcd34d', '#f472b6', '#cbd5e1'],
                        data: data.subsidy.treemap,
                        label: {
                            show: true,
                            formatter: '{b}\n{c}',
                            fontSize: 12,
                            fontFamily: 'Noto Sans TC'
                        }
                    }
                ]
            };
            chart.setOption(option);
        };

        // Initialize all mobile charts
        initTwoStroke();
        initScooterPhases();
        initDieselPhases();
        initSubsidy();

        // Consolidated resize handler for all mobile charts
        _resizeHandlers.add(() => {
            ['chart-mobile-2stroke', 'chart-mobile-phases', 'chart-mobile-diesel', 'chart-mobile-subsidy'].forEach(id => {
                const c = echarts.getInstanceByDom(document.getElementById(id));
                if (c) c.resize();
            });
        });
    };

    // initMobileDashboard() 改由點擊 mobile-source tab 時延遲觸發，
    // 確保容器從 display:none → display:block 後 ECharts 才能計算正確尺寸。
});


// ==========================================
// 噪音振動管理 Dashboard
// ==========================================


// ==========================================
// 噪音振動管理 Dashboard - Redesigned
// ==========================================
// 資料來源：統計至115年1月底。下列各縣市明細為已修正版本（桃園市、臺中市、臺南市等
// 縣市原始資料中 mobile 與 direct_fine 欄位曾對調，已還原正確值）。
// 全國加總（由本表計算，亦為頁面 KPI 顯示值）：
//   固定式 168 套、移動式 170 套（合計 338 套）、直接開罰 23,132 件、通知到檢 22,661 件。
// ⚠ 若日後調整下表數值，請同步更新 index.html 的 KPI（kpi-total-eq / kpi-direct-fine 等）。
const noiseRawData = [
    { id: 'A', county: "臺北市",  fixed: 20,  mobile: 14,  direct_fine: 6540,  notify_inspect: 8308  },
    { id: 'F', county: "新北市",  fixed: 35,  mobile: 11,  direct_fine: 5808,  notify_inspect: 4362  },
    { id: 'H', county: "桃園市",  fixed: 0,   mobile: 50,  direct_fine: 2577,  notify_inspect: 439   },
    { id: 'B', county: "臺中市",  fixed: 0,   mobile: 27,  direct_fine: 1800,  notify_inspect: 2184  },
    { id: 'D', county: "臺南市",  fixed: 26,  mobile: 22,  direct_fine: 1819,  notify_inspect: 1171  },
    { id: 'E', county: "高雄市",  fixed: 18,  mobile: 4,   direct_fine: 194,   notify_inspect: 1061  },
    { id: 'C', county: "基隆市",  fixed: 10,  mobile: 1,   direct_fine: 57,    notify_inspect: 210   },
    { id: 'O', county: "新竹市",  fixed: 8,   mobile: 5,   direct_fine: 502,   notify_inspect: 553   },
    { id: 'J', county: "新竹縣",  fixed: 4,   mobile: 4,   direct_fine: 867,   notify_inspect: 293   },
    { id: 'K', county: "苗栗縣",  fixed: 7,   mobile: 3,   direct_fine: 394,   notify_inspect: 690   },
    { id: 'N', county: "彰化縣",  fixed: 9,   mobile: 2,   direct_fine: 825,   notify_inspect: 1379  },
    { id: 'M', county: "南投縣",  fixed: 9,   mobile: 4,   direct_fine: 1168,  notify_inspect: 643   },
    { id: 'P', county: "雲林縣",  fixed: 0,   mobile: 2,   direct_fine: 56,    notify_inspect: 240   },
    { id: 'I', county: "嘉義市",  fixed: 5,   mobile: 3,   direct_fine: 203,   notify_inspect: 100   },
    { id: 'Q', county: "嘉義縣",  fixed: 2,   mobile: 4,   direct_fine: 31,    notify_inspect: 229   },
    { id: 'T', county: "屏東縣",  fixed: 2,   mobile: 3,   direct_fine: 5,     notify_inspect: 61    },
    { id: 'G', county: "宜蘭縣",  fixed: 1,   mobile: 4,   direct_fine: 153,   notify_inspect: 11    },
    { id: 'U', county: "花蓮縣",  fixed: 5,   mobile: 3,   direct_fine: 126,   notify_inspect: 116   },
    { id: 'V', county: "臺東縣",  fixed: 5,   mobile: 0,   direct_fine: 0,     notify_inspect: 524   },
    { id: 'X', county: "澎湖縣",  fixed: 0,   mobile: 1,   direct_fine: 3,     notify_inspect: 0     },
    { id: 'W', county: "金門縣",  fixed: 2,   mobile: 3,   direct_fine: 3,     notify_inspect: 87    },
    { id: 'Z', county: "連江縣",  fixed: 0,   mobile: 0,   direct_fine: 1,     notify_inspect: 0     },
].map(d => ({ ...d, total_equipment: d.fixed + d.mobile }));

let noiseRankingType = 'direct_fine';
let noiseRankChart = null;
let noiseInitialized = false;

function _noiseMapFillColor(type, ratio) {
    if (type === 'direct_fine')    return 'rgba(239,68,68,'   + (0.15 + ratio * 0.85).toFixed(3) + ')';
    if (type === 'notify_inspect') return 'rgba(245,158,11,'  + (0.15 + ratio * 0.85).toFixed(3) + ')';
    return                                'rgba(34,211,238,'  + (0.15 + ratio * 0.85).toFixed(3) + ')';
}

function initNoiseDashboard() {
    // --- KPI 2: Donut chart for equipment type ---
    const donutDom = document.getElementById('kpi-donut-chart');
    if (donutDom && !donutDom._echartsInst) {
        const donutChart = echarts.init(donutDom, null, { renderer: 'canvas' });
        donutDom._echartsInst = donutChart;
        donutChart.setOption({
            animation: true,
            series: [{
                type: 'pie',
                radius: ['55%', '85%'],
                center: ['50%', '50%'],
                data: [
                    { value: 168, name: '固定式', itemStyle: { color: '#67e8f9' } },
                    { value: 170, name: '移動式', itemStyle: { color: '#e879f9' } }
                ],
                label: { show: false },
                emphasis: { scale: false }
            }]
        });
    }

    // --- SVG Map interactions ---
    const svg = document.getElementById('noise-taiwan-svg');
    const tooltip = document.getElementById('noise-map-tooltip');
    if (svg && tooltip) {
        const maxVals = {};
        ['direct_fine', 'notify_inspect', 'total_equipment'].forEach(key => {
            maxVals[key] = Math.max(...noiseRawData.map(d => d[key])) || 1;
        });

        const updateMapColors = () => {
            noiseRawData.forEach(city => {
                const g = svg.querySelector('[data-county-id="' + city.id + '"]');
                if (!g) return;
                const ratio = city[noiseRankingType] / maxVals[noiseRankingType];
                g.setAttribute('fill', _noiseMapFillColor(noiseRankingType, ratio));
                g.setAttribute('stroke', '#999');
                g.setAttribute('stroke-width', '0.75');
                g.style.cursor = 'pointer';
                g.style.transition = 'filter 0.2s';
            });
        };
        updateMapColors();

        // Store for noiseSetRanking
        window._noiseUpdateMapColors = updateMapColors;

        if (!noiseInitialized) {
            noiseInitialized = true;
            // Fallback: hide tooltip when cursor leaves the SVG entirely
            svg.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
            _resizeHandlers.add(() => {
                if (noiseRankChart) noiseRankChart.resize();
                const donutInst = donutDom && donutDom._echartsInst;
                if (donutInst) donutInst.resize();
            });
            svg.querySelectorAll('[data-county-id]').forEach(g => {
                const id = g.getAttribute('data-county-id');
                const city = noiseRawData.find(c => c.id === id);
                if (!city) return;

                g.addEventListener('mouseenter', () => {
                    g.setAttribute('stroke', '#333');
                    g.setAttribute('stroke-width', '2');
                    g.style.filter = 'brightness(1.2)';

                    document.getElementById('noise-tt-county').textContent = city.county;
                    document.getElementById('noise-tt-fixed').textContent = city.fixed + ' 套';
                    document.getElementById('noise-tt-mobile').textContent = city.mobile + ' 套';
                    document.getElementById('noise-tt-fine').textContent = city.direct_fine.toLocaleString() + ' 件';
                    document.getElementById('noise-tt-notify').textContent = city.notify_inspect.toLocaleString() + ' 件';
                    tooltip.style.display = 'block';
                });
                g.addEventListener('mouseleave', () => {
                    const ratio = city[noiseRankingType] / maxVals[noiseRankingType];
                    g.setAttribute('fill', _noiseMapFillColor(noiseRankingType, ratio));
                    g.setAttribute('stroke', '#999');
                    g.setAttribute('stroke-width', '0.75');
                    g.style.filter = '';
                    tooltip.style.display = 'none';
                });
            });
        }
    }

    // --- Bar chart ---
    noiseRenderRankChart();
}

function noiseGetTopRank(type) {
    return [...noiseRawData]
        .sort((a, b) => b[type] - a[type])
        .slice(0, 8)
        .reverse();
}

function noiseRenderRankChart() {
    const chartDom = document.getElementById('noise-rank-chart');
    if (!chartDom) return;

    if (!noiseRankChart) {
        noiseRankChart = echarts.init(chartDom, null, { renderer: 'canvas' });
    }

    const top5 = noiseGetTopRank(noiseRankingType);
    const colorMap = {
        direct_fine: '#dc2626',
        notify_inspect: '#f59e0b',
        total_equipment: '#06b6d4'
    };
    const color = colorMap[noiseRankingType];

    const option = {
        backgroundColor: 'transparent',
        grid: { top: 0, right: 20, bottom: 0, left: 70, containLabel: false },
        xAxis: {
            type: 'value',
            axisLabel: { color: '#94a3b8', fontSize: 11 },
            axisLine: { show: false },
            splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } }
        },
        yAxis: {
            type: 'category',
            data: top5.map(d => d.county),
            axisLabel: { color: '#1e293b', fontSize: 12, fontWeight: 500 },
            axisLine: { show: false },
            axisTick: { show: false }
        },
        series: [{
            type: 'bar',
            data: top5.map((d, i) => ({
                value: d[noiseRankingType],
                itemStyle: { color: color, opacity: 0.75 + i * 0.05, borderRadius: [0, 6, 6, 0] }
            })),
            label: {
                show: true,
                position: 'right',
                color: '#1e293b',
                fontSize: 12,
                fontWeight: 500,
                formatter: (p) => p.value.toLocaleString()
            },
            barMaxWidth: 50,
            animationDuration: 1200
        }],
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'none' },
            backgroundColor: '#f8fafc',
            borderColor: '#cbd5e1',
            borderRadius: 8,
            textStyle: { color: '#1e293b' }
        }
    };
    noiseRankChart.setOption(option);
}

function noiseSetRanking(type) {
    noiseRankingType = type;

    // Update button styles - clear all, then apply to active
    document.querySelectorAll('.noise-rank-btn').forEach(btn => {
        btn.classList.remove('bg-purple-600', 'shadow-md');
        btn.classList.add('text-slate-600', 'bg-transparent');
        btn.style.background = 'transparent';
        btn.style.color = '#475569';
        btn.style.fontWeight = '500';
        btn.style.boxShadow = 'none';
    });
    const active = document.getElementById('noise-rank-btn-' + type);
    if (active) {
        active.classList.remove('text-slate-600', 'bg-transparent');
        active.classList.add('bg-purple-600', 'shadow-md');
        active.style.background = '#9333ea';
        active.style.color = 'white';
        active.style.fontWeight = '700';
        active.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    }

    // Update map colors
    if (window._noiseUpdateMapColors) window._noiseUpdateMapColors();

    // Re-render chart
    noiseRenderRankChart();
}


// ==========================================
// 逸散污染源儀表板 v2 (Fugitive Sources)
// ==========================================
let fug2Initialized = false;
let fug2ChoroplethChart = null;
let fug2Top5Chart = null;
let fug2CurrentTab = 'purification';
let fug2CurrentChoropleth = null;

function initFugitiveDashboard() {
    if (fug2Initialized) return;
    fug2Initialized = true;
    const d = (typeof fugitiveData !== 'undefined') ? fugitiveData : null;
    if (!d) { console.error('fugitiveData not loaded'); return; }

    fug2CurrentChoropleth = d.choropleth;

    fug2AnimateKPI();
    fug2AnimateBars();
    fug2BuildRiverCards(d.rivers);
    fug2RenderDonut(d.machineryLabels);
    fug2RenderStackedBar(d.ecoRituals);
    fug2RenderCatering(d.catering);

    // Tab switcher
    document.querySelectorAll('.fug2-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.fug2-tab').forEach(b => {
                b.classList.remove('active', 'bg-teal-500', 'text-white');
                b.classList.add('text-slate-500');
            });
            btn.classList.add('active', 'bg-teal-500', 'text-white');
            btn.classList.remove('text-slate-500');
            fug2CurrentTab = btn.dataset.tab;
            fug2RenderChoropleth(d.choropleth, fug2CurrentTab, null);
        });
    });

    // Load mainland-only variant of Taiwan map (islands excluded)
    const loadMaps = (geoJson) => {
        // Names already normalized & Taiwan already registered by shared _geoJsonPromise
        if (!echarts.getMap('TaiwanMain')) {
            const mainland = {
                type: 'FeatureCollection',
                features: geoJson.features.filter(f =>
                    !['金門縣','澎湖縣','連江縣'].includes(f.properties.name)
                )
            };
            echarts.registerMap('TaiwanMain', mainland);
        }
        fug2RenderShoreMap(d.ports);
        fug2RenderChoropleth(d.choropleth, 'purification', null);
    };

    // Use shared GeoJSON promise (no duplicate network requests)
    _geoJsonPromise
        .then(loadMaps)
        .catch(() => {
            // Shore map: fallback bar chart
            fug2RenderShoreMap(d.ports);
            // Choropleth: show error placeholder (no map available)
            const chorEl = document.getElementById('chart-fug2-choropleth');
            if (chorEl) {
                const errEl = document.createElement('div');
                errEl.className = 'flex flex-col items-center justify-center h-full gap-2 text-slate-400';
                const icon = document.createElement('i');
                icon.className = 'fa-solid fa-map-location-dot text-3xl';
                const msg = document.createElement('p');
                msg.textContent = '地圖載入失敗';
                errEl.appendChild(icon);
                errEl.appendChild(msg);
                chorEl.replaceChildren(errEl);
            }
            // Top5 bar chart still works without a map
            fug2RenderTop5(d.choropleth, 'purification', null);
        });
}

// ── KPI Ticker ────────────────────────────────────────────────────────────────
function fug2AnimateKPI() {
    const cards = document.querySelectorAll('.fug2-kpi');
    cards.forEach((c, i) => {
        // Add will-change hint to prevent repaints during other animations
        c.style.willChange = 'opacity, transform';
        setTimeout(() => {
            c.classList.remove('opacity-0', 'translate-y-4');
        }, 80 + i * 120);
    });

    // Batch all ticker animations into a single RAF loop instead of multiple loops
    const tickers = document.querySelectorAll('.fug2-ticker');
    if (tickers.length === 0) return;

    const tickerData = Array.from(tickers).map(el => ({
        el,
        target: parseFloat(el.dataset.target),
        fmt: el.dataset.fmt,
        startTime: null,
        done: false
    }));

    const dur = 1500;
    const masterTick = now => {
        let anyActive = false;

        tickerData.forEach(data => {
            if (data.done) return;
            if (!data.startTime) data.startTime = now;

            const p = Math.min((now - data.startTime) / dur, 1);
            const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
            const v = data.target * e;

            if (data.fmt === 'comma') data.el.textContent = Math.round(v).toLocaleString('zh-TW');
            else if (data.fmt === 'tenths') data.el.textContent = (v / 10).toFixed(1);
            else data.el.textContent = Math.round(v);

            if (p < 1) anyActive = true;
            else data.done = true;
        });

        if (anyActive) requestAnimationFrame(masterTick);
    };

    // Start all tickers at the same time (not staggered) to reduce reflow
    requestAnimationFrame(masterTick);
}

function fug2AnimateBars() {
    setTimeout(() => {
        document.querySelectorAll('.fug2-bar').forEach(bar => {
            // Promote bar to own compositing layer to avoid repainting surrounding content
            bar.style.willChange = 'width';
            bar.style.transition = 'width 1.2s cubic-bezier(0.4,0,0.2,1)';
            bar.style.width = bar.dataset.pct + '%';
        });
    }, 600);
}

// ── Shore Map ─────────────────────────────────────────────
function fug2RenderShoreMap(ports) {
    const el = document.getElementById('chart-fug2-shore-map');
    if (!el) return;
    const chart = echarts.init(el);
    const mapName = echarts.getMap('TaiwanMain') ? 'TaiwanMain' : echarts.getMap('Taiwan') ? 'Taiwan' : null;

    if (!mapName) {
        // Fallback: horizontal bar chart
        chart.setOption({
            backgroundColor: 'transparent',
            tooltip: { trigger: 'axis', textStyle: { fontSize: 13 } },
            grid: { top: 20, bottom: 80, left: 70, right: 20 },
            xAxis: { type: 'value', name: '岸電座數', nameTextStyle: { fontSize: 13 }, axisLabel: { fontSize: 13 } },
            yAxis: { type: 'category', data: ports.map(p => p.name), axisLabel: { fontSize: 13 } },
            series: [
                { name: '低壓岸電', type: 'bar', stack: 'v', data: ports.map(p => p.lowV), itemStyle: { color: '#7dd3fc' } },
                { name: '高壓岸電', type: 'bar', stack: 'v', data: ports.map(p => p.highV), itemStyle: { color: '#2dd4bf' } }
            ]
        });
        return;
    }

    const effectData = ports.map(p => ({
        name: p.name,
        value: [...p.coord, p.highV > 0 ? p.highV + 2 : 1],
        highV: p.highV, lowV: p.lowV, berths: p.berths
    }));

    // Update shore info panel
    const totalBerths = ports.reduce((a, p) => a + p.berths, 0);
    const totalHighV = ports.reduce((a, p) => a + p.highV, 0);
    const totalLowV = ports.reduce((a, p) => a + p.lowV, 0);

    const shoreBerth = document.getElementById('fug2-shore-berth');
    const shoreHigh = document.getElementById('fug2-shore-high');
    const shoreLow = document.getElementById('fug2-shore-low');
    if (shoreBerth) shoreBerth.textContent = totalBerths + ' 個';
    if (shoreHigh) shoreHigh.textContent = totalHighV + ' 座';
    if (shoreLow) shoreLow.textContent = totalLowV + ' 座';

    chart.setOption({
        backgroundColor: 'transparent',
        geo: {
            map: mapName,
            roam: false,
            aspectScale: 0.85,
            layoutCenter: ['42%', '50%'],
            layoutSize: '95%',
            itemStyle: { areaColor: '#e0f2fe', borderColor: '#7dd3fc', borderWidth: 0.8 },
            emphasis: { itemStyle: { areaColor: '#bae6fd' } },
            label: { show: false }
        },
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(15,23,42,0.92)',
            borderColor: '#06b6d4', borderWidth: 1,
            textStyle: { color: '#f8fafc', fontSize: 13 },
            formatter: p => {
                if (!p.data) return '';
                const { name, highV, lowV, berths } = p.data;
                return `<b style="color:#34d399;font-size:14px">${name}</b><br/>泊位總數：${berths} 個<br/>高壓岸電：<b>${highV}</b> 座<br/>低壓岸電：<b>${lowV}</b> 座`;
            }
        },
        series: [{
            type: 'effectScatter',
            coordinateSystem: 'geo',
            data: effectData,
            symbolSize: d => Math.max(d[2] * 4, 10),
            rippleEffect: { brushType: 'stroke', scale: 3, period: 3 },
            itemStyle: {
                color: p => p.data.highV > 0
                    ? new echarts.graphic.RadialGradient(0.4, 0.3, 1, [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#0891b2' }])
                    : new echarts.graphic.RadialGradient(0.4, 0.3, 1, [{ offset: 0, color: '#7dd3fc' }, { offset: 1, color: '#0ea5e9' }]),
                shadowBlur: 14, shadowColor: p => p.data.highV > 0 ? '#2dd4bf88' : '#7dd3fc88'
            },
            label: { show: true, position: 'right', formatter: '{b}', fontSize: 11, color: '#334155', fontWeight: 700 },
            zlevel: 2
        }]
    });
    _resizeHandlers.add(() => _safeResize(chart));
}

// ── Machinery Donut ───────────────────────────────────────
function fug2RenderDonut(ml) {
    const el = document.getElementById('chart-fug2-donut');
    if (!el) return;
    const chart = echarts.init(el);
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(15,23,42,0.92)', borderColor: '#f59e0b', borderWidth: 1,
            textStyle: { color: '#f8fafc', fontSize: 13 },
            formatter: p => `<b>${p.name}</b><br/>${p.value.toLocaleString()} 部（${p.percent}%）`
        },
        legend: {
            orient: 'vertical', right: 10, top: 'middle',
            itemWidth: 14, itemHeight: 14, itemGap: 14,
            textStyle: { fontSize: 14, color: '#334155', fontWeight: 600 }
        },
        series: [{
            type: 'pie',
            radius: ['48%', '76%'],
            center: ['38%', '50%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 },
            label: {
                show: true, position: 'center',
                formatter: () => `{total|${ml.total.toLocaleString()}}\n{sub|部 有效標章}`,
                rich: {
                    total: { fontSize: 30, fontWeight: 900, color: '#1e293b', lineHeight: 38 },
                    sub: { fontSize: 13, color: '#64748b', lineHeight: 22 }
                }
            },
            labelLine: { show: false },
            emphasis: { scale: true, scaleSize: 5 },
            data: [
                { name: '金牌', value: ml.gold.count, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#fde68a' }, { offset: 1, color: '#d97706' }]), shadowBlur: 18, shadowColor: '#fbbf2466' } },
                { name: '銀牌', value: ml.silver.count, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#e2e8f0' }, { offset: 1, color: '#94a3b8' }]) } },
                { name: '銅牌', value: ml.bronze.count, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#fed7aa' }, { offset: 1, color: '#b45309' }]) } }
            ]
        }]
    });
    _resizeHandlers.add(() => _safeResize(chart));
}

// ── Choropleth Map ────────────────────────────────────────
function fug2RenderChoropleth(choropleth, tabKey, selectedCity) {
    const el = document.getElementById('chart-fug2-choropleth');
    if (!el) return;
    const mapName = echarts.getMap('TaiwanMain') ? 'TaiwanMain' : echarts.getMap('Taiwan') ? 'Taiwan' : null;
    if (!mapName) {
        // GeoJSON not yet loaded — still update top5 bar chart which needs no map
        fug2RenderTop5(choropleth, tabKey, selectedCity);
        return;
    }

    if (!fug2ChoroplethChart) {
        fug2ChoroplethChart = echarts.init(el);
        fug2ChoroplethChart.on('click', params => {
            if (params.componentType === 'series' && params.name) {
                fug2RenderTop5(fug2CurrentChoropleth, fug2CurrentTab, params.name);
            }
        });
        _resizeHandlers.add(() => _safeResize(fug2ChoroplethChart));
    }

    const configs = {
        purification:    { data: choropleth.purification,    key: 'pm10',  label: 'PM₁₀ 削減（噸）', colors: ['#d1fae5', '#059669'], unit: '噸',  title: '空品淨化區 PM₁₀ 削減貢獻' },
        construction:    { data: choropleth.construction,    key: 'sites', label: '列管工地數',       colors: ['#e0f2fe', '#0369a1'], unit: '處',  title: '營建工程列管工地數' },
        fugitiveManaged: { data: choropleth.fugitiveManaged, key: 'count', label: '固定源納管家數',   colors: ['#ccfbf1', '#0f766e'], unit: '家',  title: '固定污染源逸散納管數' }
    };
    const cfg = configs[tabKey];
    const mapData = cfg.data.map(d => ({ name: d.city, value: d[cfg.key] }));
    const maxVal = Math.max(...mapData.map(d => d.value || 0));

    // Update info panel
    const values = cfg.data.map(d => d[cfg.key]).filter(v => v > 0);
    const totalVal = values.reduce((a, b) => a + b, 0);
    const minVal = Math.min(...values);
    const maxValNonZero = Math.max(...values);

    const infoTotal = document.getElementById('fug2-info-total');
    const infoMax = document.getElementById('fug2-info-max');
    const infoMin = document.getElementById('fug2-info-min');
    if (infoTotal) infoTotal.textContent = totalVal.toLocaleString('zh-TW') + cfg.unit;
    if (infoMax) infoMax.textContent = maxValNonZero.toLocaleString('zh-TW') + cfg.unit;
    if (infoMin) infoMin.textContent = minVal.toLocaleString('zh-TW') + cfg.unit;

    fug2ChoroplethChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(15,23,42,0.92)', borderColor: cfg.colors[1], borderWidth: 1,
            textStyle: { color: '#f8fafc', fontSize: 13 },
            formatter: p => p.value != null
                ? `<b style="font-size:14px">${p.name}</b><br/>${cfg.label}：<b>${typeof p.value === 'number' ? p.value.toLocaleString() : '--'}${cfg.unit}</b>`
                : `<b>${p.name}</b>`
        },
        visualMap: {
            min: 0, max: maxVal,
            left: 10, bottom: 20, orient: 'vertical',
            text: ['高', '低'], textStyle: { color: '#334155', fontSize: 12 },
            inRange: { color: cfg.colors }, calculable: true,
            itemWidth: 16, itemHeight: 100
        },
        series: [{
            type: 'map', map: mapName, roam: false,
            aspectScale: 0.85,
            layoutCenter: ['52%', '50%'], layoutSize: '95%',
            data: mapData, nameProperty: 'name',
            emphasis: {
                label: { show: true, fontSize: 12, color: '#fff', fontWeight: 700 },
                itemStyle: { shadowBlur: 12, shadowColor: cfg.colors[1], areaColor: cfg.colors[1] }
            },
            select: { itemStyle: { areaColor: '#f59e0b' } },
            label: { show: false },
            itemStyle: { borderColor: '#fff', borderWidth: 0.8, areaColor: '#f1f5f9' }
        }]
    });

    // Render top5 with no selection initially
    fug2RenderTop5(choropleth, tabKey, selectedCity);
}

// ── Top 5 Bar Chart ───────────────────────────────────────
function fug2RenderTop5(choropleth, tabKey, selectedCity) {
    const el = document.getElementById('chart-fug2-top5');
    if (!el) return;
    if (!fug2Top5Chart) {
        fug2Top5Chart = echarts.init(el);
        _resizeHandlers.add(() => _safeResize(fug2Top5Chart));
    }

    const configs = {
        purification:    { data: choropleth.purification,    key: 'pm10',  label: 'PM₁₀ 削減（噸）', color1: '#34d399', color2: '#059669', unit: '噸' },
        construction:    { data: choropleth.construction,    key: 'sites', label: '列管工地數',       color1: '#7dd3fc', color2: '#0369a1', unit: '處' },
        fugitiveManaged: { data: choropleth.fugitiveManaged, key: 'count', label: '固定源納管數',     color1: '#5eead4', color2: '#0f766e', unit: '家' }
    };
    const cfg = configs[tabKey];
    const sorted = [...cfg.data]
        .filter(d => d[cfg.key] > 0)
        .sort((a, b) => b[cfg.key] - a[cfg.key])
        .slice(0, 8);

    const isSelected = city => city === selectedCity;

    fug2Top5Chart.setOption({
        backgroundColor: 'transparent',
        title: {
            text: `前五名縣市排行${selectedCity ? '　▶　已選：' + selectedCity : ''}`,
            textStyle: { fontSize: 15, fontWeight: 700, color: '#334155' },
            left: 10, top: 10
        },
        grid: { top: 60, bottom: 30, left: 20, right: 80, containLabel: true },
        tooltip: {
            trigger: 'axis', axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(15,23,42,0.92)', borderColor: cfg.color2, borderWidth: 1,
            textStyle: { color: '#f8fafc', fontSize: 13 },
            formatter: params => `<b>${params[0].name}</b><br/>${cfg.label}：<b>${params[0].value.toLocaleString()}${cfg.unit}</b>`
        },
        xAxis: {
            type: 'value',
            axisLabel: { fontSize: 13, color: '#64748b' },
            splitLine: { lineStyle: { color: '#f1f5f9' } }
        },
        yAxis: {
            type: 'category',
            data: sorted.map(d => d.city).reverse(),
            axisLabel: {
                fontSize: 14, color: '#334155', fontWeight: 600,
                formatter: val => isSelected(val) ? `{sel|${val}}` : val,
                rich: { sel: { color: '#f59e0b', fontWeight: 900, fontSize: 14 } }
            },
            axisTick: { show: false }
        },
        series: [{
            type: 'bar',
            data: sorted.map(d => d[cfg.key]).reverse().map((v, i) => ({
                value: v,
                itemStyle: {
                    color: isSelected(sorted.slice().reverse()[i]?.city)
                        ? new echarts.graphic.LinearGradient(1, 0, 0, 0, [{ offset: 0, color: '#fde68a' }, { offset: 1, color: '#f59e0b' }])
                        : new echarts.graphic.LinearGradient(1, 0, 0, 0, [{ offset: 0, color: cfg.color1 }, { offset: 1, color: cfg.color2 }]),
                    borderRadius: [0, 6, 6, 0]
                }
            })),
            label: {
                show: true, position: 'right', fontSize: 13, color: '#334155', fontWeight: 600,
                formatter: p => p.value.toLocaleString() + cfg.unit
            },
            barMaxWidth: 48
        }]
    });
}

// ── River Cards ───────────────────────────────────────────
function fug2BuildRiverCards(rivers) {
    const container = document.getElementById('fug2-river-cards');
    if (!container) return;

    const accentMap = {
        '濁水溪': { border: 'border-amber-400', bg: 'bg-amber-400', light: 'bg-amber-50', text: 'text-amber-600' },
        '高屏溪': { border: 'border-emerald-400', bg: 'bg-emerald-400', light: 'bg-emerald-50', text: 'text-emerald-600' },
        '卑南溪': { border: 'border-sky-400', bg: 'bg-sky-400', light: 'bg-sky-50', text: 'text-sky-600' }
    };
    const eventColor = d => d <= 5 ? { tc: 'text-emerald-600', bg: 'bg-emerald-50', bc: 'border-emerald-200' }
                          : d <= 10 ? { tc: 'text-amber-600', bg: 'bg-amber-50', bc: 'border-amber-200' }
                          : { tc: 'text-red-600', bg: 'bg-red-50', bc: 'border-red-200' };

    container.innerHTML = rivers.map(r => {
        const pct = Math.min(r.improvedHa / r.potentialHa * 100, 100).toFixed(1);
        const { tc, bg, bc } = eventColor(r.eventDays114);
        const a = accentMap[r.name];
        const delta = r.eventDays114 - r.eventDays113;
        const deltaText = delta > 0 ? `▲ 較113年增加 ${delta} 天` : delta < 0 ? `▼ 較113年減少 ${Math.abs(delta)} 天` : '與113年持平';
        const deltaCls = delta > 0 ? 'text-red-500' : delta < 0 ? 'text-emerald-500' : 'text-slate-400';
        return `<div class="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white/80 shadow-lg">
          <div class="flex justify-between items-center mb-4">
            <h4 class="font-black text-slate-800 text-xl">${r.name}</h4>
            <span class="text-sm px-3 py-1 rounded-full ${a.light} ${a.text} font-semibold">PM<sub>10</sub> ${r.avgConc} μg/m³</span>
          </div>
          <div class="flex items-end gap-4 mb-5 p-4 rounded-2xl ${bg} border ${bc}">
            <span class="text-7xl font-black ${tc} leading-none font-number">${r.eventDays114}</span>
            <div>
              <p class="text-base font-bold ${tc}">事件日（天）</p>
              <p class="text-sm ${deltaCls} font-semibold mt-1">${deltaText}</p>
            </div>
          </div>
          <div class="mb-2 flex justify-between text-sm text-slate-500 font-medium">
            <span>揚塵施作面積</span>
          </div>
          <div class="h-4 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div class="h-full ${a.bg} rounded-full transition-all duration-1000 fug2-river-bar" style="width:0%" data-pct="${pct}"></div>
          </div>
          <div class="flex justify-between text-sm text-slate-400">
            <span>已施作 ${r.improvedHa.toLocaleString()} ha</span>
            <span>潛勢 ${r.potentialHa.toLocaleString()} ha</span>
          </div>
        </div>`;
    }).join('');

    setTimeout(() => {
        document.querySelectorAll('.fug2-river-bar').forEach(bar => {
            bar.style.width = bar.dataset.pct + '%';
        });
    }, 500);
}

// ── Stacked Bar ───────────────────────────────────────────
function fug2RenderStackedBar(data) {
    const el = document.getElementById('chart-fug2-stacked');
    if (!el) return;
    const chart = echarts.init(el);
    const years = data.map(d => d.year + '年');
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis', axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(15,23,42,0.92)', borderColor: '#10b981', borderWidth: 1,
            textStyle: { color: '#f8fafc', fontSize: 13 }
        },
        legend: { bottom: 0, itemWidth: 12, itemHeight: 12, itemGap: 14, textStyle: { fontSize: 13, color: '#334155' } },
        grid: { top: 30, bottom: 70, left: 20, right: 20, containLabel: true },
        xAxis: { type: 'category', data: years, axisLabel: { fontSize: 14, color: '#334155', fontWeight: 600 } },
        yAxis: [
            { type: 'value', name: '減量（公噸）', nameLocation: 'middle', nameGap: 48, nameTextStyle: { fontSize: 12, color: '#64748b' }, axisLabel: { fontSize: 12, color: '#64748b' } },
            { type: 'value', name: '集中燒（公噸）', nameLocation: 'middle', nameGap: 52, nameTextStyle: { fontSize: 12, color: '#f59e0b' }, axisLabel: { fontSize: 12, color: '#f59e0b' }, splitLine: { show: false } }
        ],
        series: [
            { name: '紙錢減少用量', type: 'bar', yAxisIndex: 0, barWidth: '45%',
              data: data.map(d => (d.donationNonStore || 0) + (d.riceDonation || 0) + (d.itemDonation || 0) + (d.pureReduction || 0)),
              itemStyle: { borderRadius: [6,6,0,0], color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#2dd4bf'},{offset:1,color:'#0891b2'}]) } },
            { name: '集中燒', type: 'line', yAxisIndex: 1, data: data.map(d => d.centralizedBurning),
              smooth: true, lineStyle: { color: '#f59e0b', width: 2.5, type: 'dashed' },
              itemStyle: { color: '#f59e0b' }, symbol: 'circle', symbolSize: 8 }
        ]
    });
    _resizeHandlers.add(() => _safeResize(chart));
}

// ── Catering Grouped Bar + Line Chart ────────────────────
function fug2RenderCatering(data) {
    const el = document.getElementById('chart-fug2-catering');
    if (!el) return;
    const chart = echarts.init(el);
    const years = data.map(d => d.year + '年');
    const grad = (c1, c2) => new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: c1 }, { offset: 1, color: c2 }]);
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis', axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(15,23,42,0.92)', borderColor: '#0ea5e9', borderWidth: 1,
            textStyle: { color: '#f8fafc', fontSize: 13 },
            formatter: params => {
                let s = `<b style="font-size:14px">${params[0].axisValue}</b><br/>`;
                params.forEach(p => {
                    const val = p.seriesName === '登記家數（萬）'
                        ? (p.value / 10000).toFixed(2) + ' 萬家'
                        : p.value.toLocaleString() + ' 家';
                    s += `${p.marker}${p.seriesName}：<b>${val}</b><br/>`;
                });
                return s;
            }
        },
        legend: {
            bottom: 0, itemWidth: 12, itemHeight: 12, itemGap: 16,
            textStyle: { fontSize: 13, color: '#334155' }
        },
        grid: { top: 10, bottom: 40, left: 20, right: 50, containLabel: true },
        xAxis: {
            type: 'category', data: years,
            axisLabel: { fontSize: 14, color: '#334155', fontWeight: 700 },
            axisTick: { show: false }
        },
        yAxis: [
            {
                type: 'value', name: '家數',
                nameLocation: 'middle', nameGap: 50,
                nameTextStyle: { fontSize: 12, color: '#64748b' },
                axisLabel: { fontSize: 12, color: '#64748b', formatter: v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v }
            },
            {
                type: 'value',
                nameTextStyle: { fontSize: 12, color: '#0369a1' },
                axisLabel: { fontSize: 12, color: '#0369a1', formatter: v => (v / 10000).toFixed(1) },
                splitLine: { show: false }
            }
        ],
        series: [
            {
                name: '列管家數', type: 'bar', yAxisIndex: 0,
                data: data.map(d => d.monitored), barMaxWidth: 36,
                itemStyle: { color: grad('#38bdf8', '#0369a1'), borderRadius: [4, 4, 0, 0] },
                label: { show: true, position: 'top', fontSize: 11, color: '#334155', formatter: p => p.value.toLocaleString() }
            },
            {
                name: '巡查符合', type: 'bar', yAxisIndex: 0,
                data: data.map(d => d.inspected), barMaxWidth: 36,
                itemStyle: { color: grad('#34d399', '#059669'), borderRadius: [4, 4, 0, 0] },
                label: { show: true, position: 'top', fontSize: 11, color: '#334155', formatter: p => p.value.toLocaleString() }
            },
            {
                name: '完成改善', type: 'bar', yAxisIndex: 0,
                data: data.map(d => d.compliant), barMaxWidth: 36,
                itemStyle: { color: grad('#2dd4bf', '#0f766e'), borderRadius: [4, 4, 0, 0] },
                label: { show: true, position: 'top', fontSize: 11, color: '#334155', formatter: p => p.value.toLocaleString() }
            },
            {
                name: '登記家數（萬）', type: 'line', yAxisIndex: 1,
                data: data.map(d => d.registered),
                smooth: true,
                lineStyle: { color: '#0369a1', width: 2.5, type: 'dashed' },
                itemStyle: { color: '#0369a1' },
                symbol: 'circle', symbolSize: 8,
                label: { show: false }
            }
        ]
    });
    _resizeHandlers.add(() => _safeResize(chart));
}

// ============================================================
// ============================================================
// ============================================================
// FIXED SOURCE DASHBOARD MODULE  (Real Data Edition)
// ============================================================

// -- CEMS mock data (not in JSON) ----------------------------
const FIXED_CEMS_MOCK = {
    2009:85, 2010:86, 2011:87, 2012:88, 2013:89, 2014:90,
    2015:91, 2016:92, 2017:93, 2018:94, 2019:95, 2020:96,
    2021:97, 2022:98, 2023:99, 2024:100, 2025:101,
};

// -- Permit mock data (not in JSON) --------------------------
// 2024 real data: setup=369, change=43, operation=1308
const FIXED_PERMIT_MOCK = {
    2009:{setup:150,change:30,operation:400},
    2010:{setup:160,change:32,operation:420},
    2011:{setup:170,change:34,operation:440},
    2012:{setup:180,change:36,operation:460},
    2013:{setup:190,change:38,operation:480},
    2014:{setup:200,change:40,operation:500},
    2015:{setup:210,change:41,operation:550},
    2016:{setup:220,change:41,operation:600},
    2017:{setup:240,change:41,operation:700},
    2018:{setup:260,change:41,operation:800},
    2019:{setup:280,change:41,operation:900},
    2020:{setup:300,change:41,operation:1000},
    2021:{setup:320,change:41,operation:1050},
    2022:{setup:340,change:42,operation:1100},
    2023:{setup:355,change:42,operation:1200},
    2024:{setup:369,change:43,operation:1308},
    2025:{setup:380,change:44,operation:1350},
};

let FIXED_DATA        = null;
let FIXED_MOCK_DATA   = {};
let FIXED_YEARS       = [];
const FIXED_BASE_YEAR    = 2009;
const FIXED_DEFAULT_YEAR = 2024;

// -- 1. Fetch & build data -----------------------------------
let _fixedDataPromise = null;
function fixedLoadData() {
    if (_fixedDataPromise) return _fixedDataPromise;
    _fixedDataPromise = fetch('./dashboard_data.json')
        .then(r => r.json())
        .then(json => {
            FIXED_DATA  = json;
            FIXED_YEARS = json.years.slice();
            json.years.forEach((yr, i) => {
                const yd = json.yearlyData[String(yr)] || {};
                FIXED_MOCK_DATA[yr] = {
                    totalEmission:     yd.kpi ? yd.kpi.totalEmission     : 0,
                    reductionFrom2009: yd.kpi ? yd.kpi.reductionFrom2009 : 0,
                    YoYChange:         yd.kpi ? yd.kpi.YoYChange         : 0,
                    facilities:        yd.kpi ? yd.kpi.facilities        : 0,
                    completionRate:    yd.kpi ? yd.kpi.completionRate    : 100,
                    pollutants: {
                        VOCs: json.trendData.vocs[i] || 0,
                        TSP:  json.trendData.tsp[i]  || 0,
                        SOx:  json.trendData.sox[i]  || 0,
                        NOx:  json.trendData.nox[i]  || 0,
                    },
                    topEmitters: yd.topEmitters || [],
                    countyData:  yd.countyData  || [],
                    cems:    FIXED_CEMS_MOCK[yr]   || 0,
                    permits: FIXED_PERMIT_MOCK[yr] || {setup:0,change:0,operation:0},
                };
            });
            return FIXED_MOCK_DATA;
        });
    return _fixedDataPromise;
}

// -- 2. animateValue -----------------------------------------
function fixedAnimateValue(el, end, duration, formatter) {
    if (!el) return;
    duration = duration || 900;
    const fmt = formatter || (v => Math.round(v).toLocaleString('zh-TW'));
    const startTime = performance.now();
    function step(now) {
        const p    = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(end * ease);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = fmt(end);
    }
    requestAnimationFrame(step);
}

// -- 3. KPI updater ------------------------------------------
function fixedUpdateKPIs(year) {
    const d    = FIXED_MOCK_DATA[year];
    const prev = FIXED_MOCK_DATA[year - 1];
    if (!d) return;

    fixedAnimateValue(document.getElementById('kpi-fixed-total-emission'), d.totalEmission);
    const bEmission = document.getElementById('kpi-fixed-total-emission-badge');
    if (bEmission) {
        if (prev) {
            const delta = d.totalEmission - prev.totalEmission;
            bEmission.textContent = `${delta >= 0 ? '▲ +' : '▼ '}${Math.abs(delta).toFixed(0)}`;
            bEmission.classList.remove('hidden');
        } else { bEmission.classList.add('hidden'); }
    }

    fixedAnimateValue(document.getElementById('kpi-fixed-reduce-pct'),
        d.reductionFrom2009, 900, v => v.toFixed(1));
    const bReducePct = document.getElementById('kpi-fixed-reduce-pct-badge');
    if (bReducePct) {
        if (prev) {
            const delta = d.reductionFrom2009 - prev.reductionFrom2009;
            bReducePct.textContent = `${delta >= 0 ? '▲ +' : '▼ '}${Math.abs(delta).toFixed(1)}%`;
            bReducePct.classList.remove('hidden');
        } else { bReducePct.classList.add('hidden'); }
    }

    fixedAnimateValue(document.getElementById('kpi-fixed-factories'), d.facilities);
    const bFactory = document.getElementById('kpi-fixed-factories-badge');
    if (bFactory) {
        if (prev) {
            bFactory.textContent = `上升 ${(d.facilities - prev.facilities).toLocaleString('zh-TW')} 家`;
            bFactory.classList.remove('hidden');
        } else { bFactory.classList.add('hidden'); }
    }

    fixedAnimateValue(document.getElementById('kpi-fixed-cems-count'), d.cems);
    const bCems = document.getElementById('kpi-fixed-cems-badge');
    if (bCems) {
        if (prev) {
            const delta = d.cems - prev.cems;
            bCems.textContent = `${delta >= 0 ? '增加' : '減少'} ${Math.abs(delta)} 家`;
            bCems.classList.remove('hidden');
        } else { bCems.classList.add('hidden'); }
    }
}

// -- 4. Trend Chart ------------------------------------------
let _fixedTrendChart      = null;
let _fixedActivePollutant = 'all';

function fixedRenderTrendChart(pollutant) {
    const el = document.getElementById('chart-fixed-emission-trend');
    if (!el || !FIXED_DATA) return;
    if (!_fixedTrendChart) _fixedTrendChart = echarts.init(el);

    const years  = FIXED_YEARS;
    const colors = { VOCs:'#06b6d4', TSP:'#10b981', SOx:'#f59e0b', NOx:'#6366f1' };
    const makeGrad = (top, bot) => ({
        type:'linear', x:0, y:0, x2:0, y2:1,
        colorStops:[{offset:0,color:top},{offset:1,color:bot}],
    });
    const areaColors = {
        VOCs: makeGrad('rgba(6,182,212,0.55)',  'rgba(6,182,212,0.02)'),
        TSP:  makeGrad('rgba(16,185,129,0.45)', 'rgba(16,185,129,0.02)'),
        SOx:  makeGrad('rgba(245,158,11,0.45)', 'rgba(245,158,11,0.02)'),
        NOx:  makeGrad('rgba(99,102,241,0.45)', 'rgba(99,102,241,0.02)'),
    };
    const keys    = pollutant === 'all' ? ['VOCs','TSP','SOx','NOx'] : [pollutant];
    const isStack = pollutant === 'all';

    _fixedTrendChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor:'rgba(15,23,42,0.92)', borderColor:'#0ea5e9', borderWidth:1,
            textStyle:{ color:'#f8fafc', fontSize:12 },
            formatter: params => {
                let s = `<b style="font-size:13px">${params[0].axisValue}年</b><br/>`;
                params.forEach(p => { s += `${p.marker}${p.seriesName}：<b>${Math.round(p.value).toLocaleString('zh-TW')} 噸</b><br/>`; });
                return s;
            },
        },
        legend: { top:4, right:0, itemWidth:12, itemHeight:8, itemGap:14, textStyle:{fontSize:12,color:'#475569'} },
        grid:  { top:40, right:16, bottom:36, left:72, containLabel:false },
        xAxis: {
            // Categories are 民國 (ROC) years; series data stays index-aligned via the same `years` order.
            type:'category', data: years.map(y => y - 1911), boundaryGap:false,
            axisLine:{lineStyle:{color:'#e2e8f0'}}, axisTick:{show:false},
            axisLabel:{color:'#94a3b8',fontSize:11, formatter: v => v + '年'}, splitLine:{show:false},
        },
        yAxis: {
            type:'value',
            axisLabel:{ color:'#94a3b8', fontSize:11,
                formatter: v => v>=1000000?(v/1000000).toFixed(1)+'M':(v/1000).toFixed(0)+'k' },
            splitLine:{lineStyle:{color:'#f1f5f9',type:'dashed'}},
            axisLine:{show:false}, axisTick:{show:false},
        },
        series: keys.map(k => ({
            name:k, type:'line', stack:isStack?'total':undefined,
            smooth:true, symbol:'none',
            lineStyle:{color:colors[k],width:2},
            areaStyle:{color:areaColors[k]},
            data: years.map(yr => (FIXED_MOCK_DATA[yr] && FIXED_MOCK_DATA[yr].pollutants[k]) || 0),
        })),
    }, true);
}

// -- 5. Donut Chart (permit mock) ----------------------------
let _fixedDonutChart = null;
function fixedRenderDonutChart(year) {
    const el = document.getElementById('chart-fixed-permit-donut');
    if (!el) return;
    if (!_fixedDonutChart) _fixedDonutChart = echarts.init(el);
    const d = FIXED_MOCK_DATA[year];
    if (!d) return;
    const p = d.permits;
    const total = p.setup + p.change + p.operation;
    _fixedDonutChart.setOption({
        backgroundColor:'transparent',
        tooltip:{
            trigger:'item',
            backgroundColor:'rgba(15,23,42,0.92)', borderColor:'#0ea5e9', borderWidth:1,
            textStyle:{color:'#f8fafc',fontSize:12},
            formatter: params =>
                `${params.marker}<b>${params.name}</b><br/>${params.value.toLocaleString('zh-TW')} 件 &nbsp;<b>${params.percent}%</b>`,
        },
        legend:{ orient:'horizontal', bottom:4, itemWidth:10, itemHeight:10, itemGap:14, textStyle:{fontSize:12,color:'#475569'} },
        series:[{
            type:'pie', radius:['45%','70%'], center:['50%','46%'],
            avoidLabelOverlap:false,
            itemStyle:{ borderRadius:6, borderColor:'#fff', borderWidth:2 },
            label:{
                show:true, position:'center',
                formatter:() => `{total|${total.toLocaleString('zh-TW')}}\n{sub|件}`,
                rich:{
                    total:{fontSize:22,fontWeight:'bold',color:'#1e293b',lineHeight:30},
                    sub:  {fontSize:12,color:'#94a3b8',lineHeight:18},
                },
            },
            emphasis:{ label:{show:true}, itemStyle:{shadowBlur:12,shadowOffsetX:0,shadowColor:'rgba(0,0,0,0.15)'} },
            data:[
                {value:p.setup,     name:'設置許可', itemStyle:{color:'#06b6d4'}},
                {value:p.change,    name:'變更許可', itemStyle:{color:'#6366f1'}},
                {value:p.operation, name:'操作許可', itemStyle:{color:'#10b981'}},
            ],
        }],
    }, true);
}

// -- 6. Treemap (real county data, top 10) -------------------
function _fixedLerpColor(hexLow, hexHigh, t) {
    const parse = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    const [r1,g1,b1] = parse(hexLow), [r2,g2,b2] = parse(hexHigh);
    return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

let _fixedTreemapChart = null;
function fixedRenderTreemap(year) {
    const el = document.getElementById('chart-fixed-treemap');
    if (!el || !FIXED_MOCK_DATA[year]) return;
    if (!_fixedTreemapChart) _fixedTreemapChart = echarts.init(el);

    const allCounty = FIXED_MOCK_DATA[year].countyData || [];
    // Unattributed emissions: kept (not hidden) so the treemap reconciles with the headline total,
    // but shown as a neutral block so it doesn't distort the county-to-county comparison.
    const unclassified = allCounty.find(c => c.name === '其他（未分類）');
    const raw = allCounty
        .filter(c => c.name !== '其他（未分類）')
        .sort((a,b) => b.value - a.value)
        .slice(0, 8);

    const total  = FIXED_MOCK_DATA[year].totalEmission;
    const maxVal = raw.length ? raw[0].value : 1;
    const minVal = raw.length ? raw[raw.length-1].value : 0;
    const span   = maxVal - minVal || 1;

    const data = raw.map(c => {
        const t = (c.value - minVal) / span;
        const color = t < 0.5
            ? _fixedLerpColor('#bae6fd','#0891b2', t * 2)
            : _fixedLerpColor('#0891b2','#0c4a6e', (t-0.5) * 2);
        return { name:c.name, value:Math.round(c.value), itemStyle:{color} };
    });
    if (unclassified && unclassified.value > 0) {
        data.push({
            name: '其他（未分類）',
            value: Math.round(unclassified.value),
            itemStyle: { color: '#94a3b8' }   // neutral slate — signals "not a county"
        });
    }

    _fixedTreemapChart.setOption({
        backgroundColor:'transparent',
        tooltip:{
            formatter: p =>
                `<b>${p.name}</b><br/>${p.marker}排放量：<b>${p.value.toLocaleString('zh-TW')} 噸</b><br/>` +
                `占全國 ${((p.value/total)*100).toFixed(1)}%`,
            backgroundColor:'rgba(15,23,42,0.92)', borderColor:'#0ea5e9', borderWidth:1,
            textStyle:{color:'#f8fafc',fontSize:12},
        },
        series:[{
            type:'treemap', roam:false, nodeClick:false,
            breadcrumb:{show:false}, visibleMin:500,
            label:{
                show:true,
                formatter: p => {
                    const pct = ((p.value/total)*100).toFixed(1);
                    if (p.value > total*0.05) return `{name|${p.name}}\n{val|${(p.value/1000).toFixed(1)}k 噸 · ${pct}%}`;
                    if (p.value > total*0.02) return p.name;
                    return '';
                },
                rich:{
                    name:{fontSize:13,fontWeight:'bold',color:'#fff',lineHeight:20},
                    val: {fontSize:11,color:'rgba(255,255,255,0.85)',lineHeight:17},
                },
            },
            upperLabel:{show:false},
            itemStyle:{borderColor:'#fff',borderWidth:2,gapWidth:2},
            emphasis:{itemStyle:{shadowBlur:10,shadowColor:'rgba(0,0,0,0.25)'},label:{fontSize:14}},
            data, width:'100%', height:'100%',
        }],
    }, true);
}

// -- 7. Top-5 HTML (real topEmitters) ------------------------
function fixedRenderTop5(year) {
    const container = document.getElementById('fixed-top-emitters');
    if (!container || !FIXED_MOCK_DATA[year]) return;
    const emitters = FIXED_MOCK_DATA[year].topEmitters;
    if (!emitters || !emitters.length) {
        container.innerHTML = '<p class="text-slate-400 text-sm">無資料</p>';
        return;
    }

    const maxVal = emitters[0].value;
    const gradients = [
        'from-cyan-400 to-blue-500',
        'from-sky-400 to-indigo-500',
        'from-violet-400 to-purple-500',
        'from-teal-400 to-emerald-500',
        'from-amber-400 to-orange-500',
        'from-pink-400 to-rose-500',
        'from-lime-400 to-green-500',
        'from-fuchsia-400 to-pink-500',
    ];

    const rows = emitters.slice(0,8).map((f, i) => {
        const barPct = Math.round((f.value / maxVal) * 100);
        const chg    = f.change;
        let badgeHtml = '';
        if (chg !== 0) {
            badgeHtml = chg > 0
                ? `<span class="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 whitespace-nowrap">▲ ${chg.toFixed(1)}%</span>`
                : `<span class="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 whitespace-nowrap">▼ ${Math.abs(chg).toFixed(1)}%</span>`;
        }
        const displayName = f.name.length > 14 ? f.name.slice(0,14) + '…' : f.name;
        return `
        <div>
            <div class="flex items-center justify-between mb-1.5 gap-2">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-black flex items-center justify-center flex-shrink-0">${i+1}</span>
                    <span class="text-sm font-semibold text-slate-700 truncate" title="${f.name}">${displayName}</span>
                    ${badgeHtml}
                </div>
                <span class="text-sm font-number font-bold text-slate-600 flex-shrink-0">${f.value.toLocaleString('zh-TW')} 噸</span>
            </div>
            <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r ${gradients[i]} top5-bar"
                     style="width:0%;transition:width 700ms cubic-bezier(0.4,0,0.2,1);"
                     data-target="${barPct}"></div>
            </div>
        </div>`;
    });

    container.innerHTML = rows.join('');
    requestAnimationFrame(() => requestAnimationFrame(() => {
        container.querySelectorAll('.top5-bar').forEach(b => { b.style.width = b.dataset.target + '%'; });
    }));
}

// -- 8. Populate year selector --------------------------------
function fixedPopulateYearSelector() {
    const sel = document.getElementById('fixed-filter-year');
    if (!sel || !FIXED_YEARS.length) return;
    sel.innerHTML = '';
    [...FIXED_YEARS].reverse().forEach(yr => {
        const opt = document.createElement('option');
        opt.value = yr;                       // keep ROC→AD value for data lookup
        opt.textContent = (yr - 1911) + '年'; // display in 民國 (ROC) to match other tabs
        if (yr === FIXED_DEFAULT_YEAR) opt.selected = true;
        sel.appendChild(opt);
    });
}

// -- 9. Init (lazy, on tab click) ----------------------------
let _fixedDashboardInitialized = false;

function initFixedDashboard() {
    fixedLoadData().then(() => {
        if (!_fixedDashboardInitialized) {
            fixedPopulateYearSelector();

            const sel = document.getElementById('fixed-filter-year');
            if (sel) {
                sel.addEventListener('change', () => {
                    const yr = parseInt(sel.value, 10);
                    if (!isNaN(yr) && FIXED_MOCK_DATA[yr]) {
                        fixedUpdateKPIs(yr);
                        fixedRenderDonutChart(yr);
                        fixedRenderTreemap(yr);
                        fixedRenderTop5(yr);
                    }
                });
            }

            const tabBar = document.getElementById('fixed-emission-type-tabs');
            if (tabBar) {
                tabBar.addEventListener('click', e => {
                    const btn = e.target.closest('.fixed-emission-tab');
                    if (!btn) return;
                    tabBar.querySelectorAll('.fixed-emission-tab').forEach(b => {
                        b.classList.remove('active','bg-cyan-500','text-white');
                        b.classList.add('text-slate-500');
                    });
                    btn.classList.add('active','bg-cyan-500','text-white');
                    btn.classList.remove('text-slate-500');
                    _fixedActivePollutant = btn.dataset.pollutant;
                    fixedRenderTrendChart(_fixedActivePollutant);
                });
            }

            _resizeHandlers.add(() => {
                if (_fixedTrendChart)   _fixedTrendChart.resize();
                if (_fixedDonutChart)   _fixedDonutChart.resize();
                if (_fixedTreemapChart) _fixedTreemapChart.resize();
            });

            _fixedDashboardInitialized = true;
        }

        const yr = parseInt(document.getElementById('fixed-filter-year')?.value || FIXED_DEFAULT_YEAR, 10);
        fixedUpdateKPIs(yr);
        fixedRenderTrendChart(_fixedActivePollutant);
        fixedRenderDonutChart(yr);
        fixedRenderTreemap(yr);
        fixedRenderTop5(yr);
    });
}

// ============================================================
// 空品推廣成果 (IAQ 室內空氣品質標章) 儀表板
// ============================================================

let _promoDashboardInitialized = false;
let _promoMapChart = null;
let _promoDonutAnnounce = null;
let _promoDonutGrade = null;
let _promoCatChart = null;
let _promoSelectedCity = 'all';

// 取得目前選取縣市的資料（'all' → 全台摘要）
function promoGetData(cityKey) {
    if (cityKey === 'all' || !IAQ_DATA.cities[cityKey]) {
        return {
            total: IAQ_DATA.summary.total_certified,
            public: IAQ_DATA.summary.public_places,
            private: IAQ_DATA.summary.private_places,
            excellent: IAQ_DATA.summary.excellent_grade,
            good: IAQ_DATA.summary.good_grade,
            categories: IAQ_DATA.national_categories
        };
    }
    return IAQ_DATA.cities[cityKey];
}

// 更新頂部城市資訊標頭
function promoUpdateHeader(cityKey) {
    const label = cityKey === 'all' ? '全台灣' : cityKey;
    const d = promoGetData(cityKey);
    const excellencePct = ((d.excellent / d.total) * 100).toFixed(1);

    const cityEl = document.getElementById('iaq-selected-city');
    const totalEl = document.getElementById('iaq-city-total');
    const badgeEl = document.getElementById('iaq-excellence-badge');
    const resetBtn = document.getElementById('iaq-reset-btn');

    if (cityEl) cityEl.textContent = label;
    if (totalEl) totalEl.textContent = d.total.toLocaleString('zh-TW');
    if (badgeEl) {
        badgeEl.querySelector('.font-black').textContent = excellencePct + '%';
    }
    if (resetBtn) {
        cityKey === 'all' ? resetBtn.classList.add('hidden') : resetBtn.classList.remove('hidden');
    }
}

// 甜甜圈圖（公告 vs 非公告）
function promoRenderDonutAnnounce(cityKey) {
    const el = document.getElementById('chart-iaq-donut-announce');
    if (!el) return;
    if (!_promoDonutAnnounce) _promoDonutAnnounce = echarts.init(el);
    const d = promoGetData(cityKey);

    _promoDonutAnnounce.setOption({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(15,23,42,0.92)',
            borderColor: '#8b5cf6', borderWidth: 1,
            textStyle: { color: '#f8fafc', fontFamily: 'Noto Sans TC', fontSize: 13 },
            formatter: p => `<b>${p.name}</b><br/>${p.value.toLocaleString('zh-TW')} 場所　<b>${p.percent}%</b>`
        },
        legend: {
            bottom: 0,
            textStyle: { color: '#475569', fontFamily: 'Noto Sans TC', fontSize: 12 }
        },
        graphic: [
            {
                type: 'text', left: 'center', top: '36%',
                style: { text: d.total.toLocaleString('zh-TW'), textAlign: 'center', fill: '#0f172a', fontSize: 22, fontWeight: 'bold', fontFamily: 'Outfit, sans-serif' }
            },
            {
                type: 'text', left: 'center', top: '52%',
                style: { text: '場所', textAlign: 'center', fill: '#64748b', fontSize: 11, fontFamily: 'Noto Sans TC' }
            }
        ],
        series: [{
            type: 'pie',
            radius: ['48%', '68%'],
            center: ['50%', '48%'],
            avoidLabelOverlap: false,
            label: { show: false },
            emphasis: { label: { show: false }, itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
            data: [
                { name: '公告場所', value: d.public, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#8b5cf6' }, { offset: 1, color: '#6d28d9' }]) } },
                { name: '非公告場所', value: d.private, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#c4b5fd' }, { offset: 1, color: '#a78bfa' }]) } }
            ]
        }]
    });
}

// 甜甜圈圖（優良 vs 良好）
function promoRenderDonutGrade(cityKey) {
    const el = document.getElementById('chart-iaq-donut-grade');
    if (!el) return;
    if (!_promoDonutGrade) _promoDonutGrade = echarts.init(el);
    const d = promoGetData(cityKey);
    const excellencePct = ((d.excellent / d.total) * 100).toFixed(1);

    _promoDonutGrade.setOption({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(15,23,42,0.92)',
            borderColor: '#f59e0b', borderWidth: 1,
            textStyle: { color: '#f8fafc', fontFamily: 'Noto Sans TC', fontSize: 13 },
            formatter: p => `<b>${p.name}</b><br/>${p.value.toLocaleString('zh-TW')} 場所　<b>${p.percent}%</b>`
        },
        legend: {
            bottom: 0,
            textStyle: { color: '#475569', fontFamily: 'Noto Sans TC', fontSize: 12 }
        },
        graphic: [
            {
                type: 'text', left: 'center', top: '36%',
                style: { text: excellencePct + '%', textAlign: 'center', fill: '#92400e', fontSize: 20, fontWeight: 'bold', fontFamily: 'Outfit, sans-serif' }
            },
            {
                type: 'text', left: 'center', top: '52%',
                style: { text: '優良級', textAlign: 'center', fill: '#64748b', fontSize: 11, fontFamily: 'Noto Sans TC' }
            }
        ],
        series: [{
            type: 'pie',
            radius: ['48%', '68%'],
            center: ['50%', '48%'],
            avoidLabelOverlap: false,
            label: { show: false },
            emphasis: { label: { show: false }, itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
            data: [
                { name: '優良級', value: d.excellent, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#fbbf24' }, { offset: 1, color: '#d97706' }]) } },
                { name: '良好級', value: d.good, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#fde68a' }, { offset: 1, color: '#fcd34d' }]) } }
            ]
        }]
    });
}

// 水平長條圖（前5大場所類別）
function promoRenderCategoryChart(cityKey) {
    const el = document.getElementById('chart-iaq-category');
    if (!el) return;
    if (!_promoCatChart) _promoCatChart = echarts.init(el);
    const d = promoGetData(cityKey);
    const cats = Object.entries(d.categories).sort((a, b) => a[1] - b[1]); // 升冪以 y 軸由下到上呈現

    _promoCatChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(15,23,42,0.92)',
            borderColor: '#38bdf8', borderWidth: 1,
            textStyle: { color: '#f8fafc', fontFamily: 'Noto Sans TC', fontSize: 13 },
            formatter: params => {
                const p = params[0];
                return `<b>${p.name}</b><br/>標章數量：<b style="color:#38bdf8">${p.value}</b> 場所`;
            }
        },
        grid: { top: 8, bottom: 8, left: 8, right: 48, containLabel: true },
        xAxis: {
            type: 'value',
            axisLine: { show: false }, axisTick: { show: false },
            axisLabel: { fontSize: 11, color: '#94a3b8', fontFamily: 'Noto Sans TC' },
            splitLine: { lineStyle: { color: '#f1f5f9' } }
        },
        yAxis: {
            type: 'category',
            data: cats.map(c => c[0]),
            axisLabel: { fontSize: 12, color: '#475569', fontFamily: 'Noto Sans TC' },
            axisLine: { show: false }, axisTick: { show: false }
        },
        series: [{
            type: 'bar',
            data: cats.map(c => c[1]),
            barMaxWidth: 22,
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: '#7dd3fc' },
                    { offset: 1, color: '#0284c7' }
                ]),
                borderRadius: [0, 8, 8, 0]
            },
            label: { show: true, position: 'right', fontSize: 12, color: '#475569', fontFamily: 'Outfit, sans-serif', fontWeight: 'bold' }
        }]
    });
}

// 台灣熱力地圖
function promoRenderMap() {
    const el = document.getElementById('chart-iaq-map');
    if (!el) return;
    if (!_promoMapChart) _promoMapChart = echarts.init(el);

    const mapData = Object.entries(IAQ_DATA.cities).map(([city, d]) => ({ name: city, value: d.total }));
    const maxVal = Math.max(...mapData.map(d => d.value));

    const buildOption = () => ({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(15,23,42,0.95)',
            borderColor: 'rgba(16,185,129,0.5)', borderWidth: 1,
            textStyle: { color: '#f8fafc', fontFamily: 'Noto Sans TC', fontSize: 13 },
            formatter: params => {
                const cityData = IAQ_DATA.cities[params.name];
                if (cityData) {
                    const pct = ((cityData.excellent / cityData.total) * 100).toFixed(1);
                    return `<b style="font-size:15px;color:#34d399">${params.name}</b><br/>
                            標章總數：<b>${cityData.total}</b> 場所<br/>
                            公告 <b>${cityData.public}</b>　非公告 <b>${cityData.private}</b><br/>
                            優良級佔比：<b style="color:#86efac">${pct}%</b>`;
                }
                return `<b>${params.name}</b><br/><span style="color:#94a3b8">暫無標章資料</span>`;
            }
        },
        visualMap: {
            min: 0, max: maxVal,
            left: 'left', top: 'bottom',
            text: ['多', '少'],
            textStyle: { color: '#64748b', fontFamily: 'Noto Sans TC', fontSize: 12 },
            inRange: { color: ['#ecfdf5', '#a7f3d0', '#34d399', '#10b981', '#047857'] },
            calculable: true,
            itemWidth: 14, itemHeight: 80
        },
        series: [{
            name: '室內空品標章數量',
            type: 'map',
            map: echarts.getMap('TaiwanMain') ? 'TaiwanMain' : 'Taiwan',
            roam: false,
            aspectScale: 0.85,
            layoutCenter: ['50%', '50%'],
            layoutSize: '130%',
            label: { show: true, fontSize: 10, color: '#475569', fontFamily: 'Noto Sans TC' },
            emphasis: {
                label: { show: true, fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
                itemStyle: { areaColor: '#fde68a', shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.25)' }
            },
            itemStyle: { borderColor: '#fff', borderWidth: 1.5, areaColor: '#f0fdf4' },
            data: mapData
        }]
    });

    const doRender = () => {
        _promoMapChart.setOption(buildOption());
        _promoMapChart.off('click');
        _promoMapChart.on('click', params => {
            const city = params.name;
            _promoSelectedCity = IAQ_DATA.cities[city] ? city : 'all';
            promoUpdateHeader(_promoSelectedCity);
            promoRenderDonutAnnounce(_promoSelectedCity);
            promoRenderDonutGrade(_promoSelectedCity);
            promoRenderCategoryChart(_promoSelectedCity);
        });
    };

    // Use shared GeoJSON promise (no duplicate network requests)
    _geoJsonPromise
        .then(() => { doRender(); })
        .catch(() => {
            if (el) {
                const errEl = document.createElement('div');
                errEl.className = 'flex items-center justify-center h-full text-slate-400 p-8';
                errEl.textContent = '地圖載入失敗，請確認網路連線';
                el.replaceChildren(errEl);
            }
        });
}

// 主初始化函式（由 tab 點擊觸發，可重複呼叫）
function initPromoDashboard() {
    // 初始化各圖表（已初始化則重新渲染以確保尺寸正確）
    promoRenderMap();
    promoRenderDonutAnnounce(_promoSelectedCity);
    promoRenderDonutGrade(_promoSelectedCity);
    promoRenderCategoryChart(_promoSelectedCity);
    promoUpdateHeader(_promoSelectedCity);

    // 重設按鈕
    if (!_promoDashboardInitialized) {
        const resetBtn = document.getElementById('iaq-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                _promoSelectedCity = 'all';
                promoUpdateHeader('all');
                promoRenderDonutAnnounce('all');
                promoRenderDonutGrade('all');
                promoRenderCategoryChart('all');
                resetBtn.classList.add('hidden');
            });
        }

        _resizeHandlers.add(() => {
            if (_promoMapChart) _promoMapChart.resize();
            if (_promoDonutAnnounce) _promoDonutAnnounce.resize();
            if (_promoDonutGrade) _promoDonutGrade.resize();
            if (_promoCatChart) _promoCatChart.resize();
        });

        _promoDashboardInitialized = true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fixedLoadData().then(() => {
        fixedPopulateYearSelector();
        fixedUpdateKPIs(FIXED_DEFAULT_YEAR);
    });
});

// ==========================================
// Accessibility: give ECharts/canvas chart containers a screen-reader name.
// Canvas charts are otherwise announced as empty. role="img" + aria-label only
// affects assistive tech — no visual or data change. Decorative-only containers
// already convey their numbers via adjacent text.
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const chartLabels = {
        'map-container': '全國空氣品質維護區縣市分布地圖',
        'chart-airzone-trend': '空氣品質維護區歷年核定趨勢圖',
        'chart-airzone-leaderboard': '各縣市空氣品質維護區核定數排行榜',
        'chart-airzone-donut': '空氣品質維護區類型占比圖',
        'chart-fixed-emission-trend': '固定污染源歷年排放量趨勢圖',
        'chart-fixed-permit-donut': '固定污染源許可證類型占比圖',
        'chart-fixed-treemap': '各縣市固定污染源排放量矩形樹圖',
        'chart-mobile-2stroke': '二行程機車剩餘總數趨勢圖',
        'chart-mobile-phases': '燃油機車各期別登記數圖',
        'chart-mobile-diesel': '柴油車各期別登記數圖',
        'chart-mobile-subsidy': '老舊車輛汰舊補助統計圖',
        'kpi-donut-chart': '噪音振動設備固定與移動占比圖',
        'noise-rank-chart': '各縣市噪音振動管理績效排行榜',
        'chart-fug2-choropleth': '逸散污染源縣市分布地圖',
        'chart-fug2-top5': '逸散污染源前五名縣市排行圖',
        'chart-fug2-shore-map': '全國港口岸電設置地圖',
        'chart-fug2-donut': '營建機具金銀銅牌占比圖',
        'chart-fug2-stacked': '紙錢集中燃燒與減量統計圖',
        'chart-fug2-catering': '餐飲業空氣污染防制統計圖',
        'chart-iaq-map': '室內空氣品質標章縣市分布地圖',
        'chart-iaq-donut-announce': '室內空氣品質場所公告類型占比圖',
        'chart-iaq-donut-grade': '室內空氣品質標章評等占比圖',
        'chart-iaq-category': '室內空氣品質標章場所類別分布圖'
    };
    for (const [id, label] of Object.entries(chartLabels)) {
        const el = document.getElementById(id);
        if (el) {
            el.setAttribute('role', 'img');
            el.setAttribute('aria-label', label);
        }
    }
});
