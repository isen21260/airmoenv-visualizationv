// ============================================================
// 室內空氣品質 (IAQ) 標章認證儀表板 Mock Data
// 資料來源：環境部空氣品質保護及噪音管制處 (推廣科)
// ============================================================
const IAQ_DATA = {
    summary: {
        total_certified: 1285,
        public_places: 850,
        private_places: 435,
        excellent_grade: 920,
        good_grade: 365
    },
    cities: {
        "基隆市": {
            total: 42, public: 25, private: 17, excellent: 38, good: 4,
            categories: { "幼兒園": 12, "醫療機構": 10, "政府機關辦公場所": 8, "大專院校": 7, "托嬰中心": 5 }
        },
        "臺北市": {
            total: 210, public: 130, private: 80, excellent: 185, good: 25,
            categories: { "政府機關辦公場所": 55, "醫療機構": 45, "大專院校": 40, "幼兒園": 35, "商場": 35 }
        },
        "新北市": {
            total: 185, public: 115, private: 70, excellent: 150, good: 35,
            categories: { "幼兒園": 50, "政府機關辦公場所": 45, "醫療機構": 40, "大專院校": 25, "社福機構": 25 }
        },
        "臺中市": {
            total: 150, public: 100, private: 50, excellent: 110, good: 40,
            categories: { "醫療機構": 35, "政府機關辦公場所": 30, "幼兒園": 30, "大專院校": 30, "圖書館": 25 }
        },
        "高雄市": {
            total: 165, public: 110, private: 55, excellent: 120, good: 45,
            categories: { "政府機關辦公場所": 40, "醫療機構": 35, "大專院校": 35, "幼兒園": 30, "社福機構": 25 }
        },
        "屏東縣": {
            total: 78, public: 50, private: 28, excellent: 20, good: 58,
            categories: { "圖書館": 20, "社福機構": 18, "醫療機構": 15, "政府機關辦公場所": 15, "大專院校": 10 }
        },
        "花蓮縣": {
            total: 45, public: 30, private: 15, excellent: 15, good: 30,
            categories: { "社福機構": 12, "醫療機構": 10, "政府機關辦公場所": 10, "大專院校": 8, "圖書館": 5 }
        },
        "臺東縣": {
            total: 35, public: 25, private: 10, excellent: 10, good: 25,
            categories: { "幼兒園": 10, "醫療機構": 8, "政府機關辦公場所": 7, "圖書館": 5, "社福機構": 5 }
        }
    },
    // 全台加總前5大場所類別 (預先計算)
    national_categories: {
        "政府機關辦公場所": 210,
        "醫療機構": 198,
        "幼兒園": 177,
        "大專院校": 155,
        "社福機構": 85
    }
};
