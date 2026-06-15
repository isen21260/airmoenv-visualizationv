// ============================================================
// 室內空氣品質 (IAQ) 自主標章認證儀表板資料
// 資料來源：自主標章輔導成果_12月_0108 修正版.xls（環境部 推廣科）
// 統計口徑：有效標章（狀態為「已通過」或「已展延」），統計至 114 年 12 月底
// 由 .xls 一次性彙整寫死，執行期不再讀取原始檔。
// ============================================================
const IAQ_DATA = {
    summary: {
        total_certified: 2341,
        public_places: 1096,
        private_places: 1245,
        excellent_grade: 1624,
        good_grade: 717
    },
    cities: {
        "臺北市": {
            total: 337, public: 246, private: 91, excellent: 215, good: 122,
            categories: { "大眾捷運系統車站": 45, "圖書館": 44, "社福機構": 43, "商場": 42, "政府機關辦公場所": 27 }
        },
        "高雄市": {
            total: 288, public: 153, private: 135, excellent: 228, good: 60,
            categories: { "社福機構": 75, "圖書館": 31, "大眾捷運系統車站": 27, "商場": 25, "幼兒園": 23 }
        },
        "新北市": {
            total: 262, public: 102, private: 160, excellent: 161, good: 101,
            categories: { "社福機構": 100, "托嬰中心": 31, "大眾捷運系統車站": 31, "商場": 22, "大專院校": 21 }
        },
        "桃園市": {
            total: 210, public: 112, private: 98, excellent: 136, good: 74,
            categories: { "社福機構": 59, "幼兒園": 25, "圖書館": 22, "商場": 20, "運動健身場所": 17 }
        },
        "臺中市": {
            total: 183, public: 108, private: 75, excellent: 114, good: 69,
            categories: { "社福機構": 65, "圖書館": 33, "商場": 17, "大專院校": 15, "醫療機構": 11 }
        },
        "臺南市": {
            total: 183, public: 70, private: 113, excellent: 119, good: 64,
            categories: { "社福機構": 63, "托嬰中心": 27, "圖書館": 17, "產後護理機構": 11, "商場": 11 }
        },
        "屏東縣": {
            total: 167, public: 40, private: 127, excellent: 138, good: 29,
            categories: { "政府機關辦公場所": 50, "社福機構": 47, "托嬰中心": 12, "博物館、美術館": 12, "幼兒園": 11 }
        },
        "彰化縣": {
            total: 91, public: 29, private: 62, excellent: 66, good: 25,
            categories: { "社福機構": 45, "圖書館": 9, "幼兒園": 6, "政府機關辦公場所": 5, "托嬰中心": 5 }
        },
        "宜蘭縣": {
            total: 83, public: 21, private: 62, excellent: 67, good: 16,
            categories: { "社福機構": 36, "幼兒園": 10, "托嬰中心": 6, "醫療機構": 6, "政府機關辦公場所": 5 }
        },
        "嘉義市": {
            total: 68, public: 22, private: 46, excellent: 50, good: 18,
            categories: { "社福機構": 23, "幼兒園": 11, "托嬰中心": 7, "商場": 6, "產後護理機構": 5 }
        },
        "南投縣": {
            total: 66, public: 15, private: 51, excellent: 47, good: 19,
            categories: { "社福機構": 21, "幼兒園": 20, "圖書館": 7, "托嬰中心": 6, "醫療機構": 4 }
        },
        "新竹縣": {
            total: 63, public: 18, private: 45, excellent: 47, good: 16,
            categories: { "幼兒園": 18, "社福機構": 13, "托嬰中心": 6, "商場": 5, "醫療機構": 4 }
        },
        "嘉義縣": {
            total: 61, public: 14, private: 47, excellent: 40, good: 21,
            categories: { "社福機構": 24, "幼兒園": 10, "托嬰中心": 9, "圖書館": 5, "大專院校": 3 }
        },
        "新竹市": {
            total: 51, public: 23, private: 28, excellent: 29, good: 22,
            categories: { "托嬰中心": 11, "產後護理機構": 8, "商場": 7, "大專院校": 6, "社福機構": 6 }
        },
        "雲林縣": {
            total: 44, public: 18, private: 26, excellent: 26, good: 18,
            categories: { "社福機構": 15, "幼兒園": 4, "圖書館": 4, "政府機關辦公場所": 4, "商場": 3 }
        },
        "基隆市": {
            total: 44, public: 21, private: 23, excellent: 34, good: 10,
            categories: { "幼兒園": 10, "醫療機構": 7, "社福機構": 6, "運動健身場所": 5, "政府機關辦公場所": 4 }
        },
        "苗栗縣": {
            total: 43, public: 22, private: 21, excellent: 31, good: 12,
            categories: { "社福機構": 13, "幼兒園": 5, "圖書館": 5, "產後護理機構": 4, "政府機關辦公場所": 3 }
        },
        "臺東縣": {
            total: 33, public: 17, private: 16, excellent: 27, good: 6,
            categories: { "醫療機構": 6, "社福機構": 5, "政府機關辦公場所": 5, "幼兒園": 5, "大專院校": 2 }
        },
        "花蓮縣": {
            total: 28, public: 20, private: 8, excellent: 22, good: 6,
            categories: { "政府機關辦公場所": 6, "大專院校": 4, "社福機構": 4, "醫療機構": 3, "鐵路車站": 2 }
        },
        "澎湖縣": {
            total: 23, public: 12, private: 11, excellent: 15, good: 8,
            categories: { "幼兒園": 9, "政府機關辦公場所": 4, "社福機構": 2, "金融機構營業場所": 2, "大專院校": 1 }
        },
        "金門縣": {
            total: 8, public: 8, private: 0, excellent: 7, good: 1,
            categories: { "大專院校": 1, "圖書館": 1, "政府機關辦公場所": 1, "社福機構": 1, "航空站": 1 }
        },
        "連江縣": {
            total: 5, public: 5, private: 0, excellent: 5, good: 0,
            categories: { "政府機關辦公場所": 2, "社福機構": 1, "博物館、美術館": 1, "運動健身場所": 1 }
        }
    },
    // 全台加總前5大場所類別（預先計算）
    national_categories: {
        "社福機構": 667, "圖書館": 195, "幼兒園": 193, "商場": 179, "政府機關辦公場所": 173
    }
};
