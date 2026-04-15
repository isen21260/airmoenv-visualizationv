const fugitiveData = {
  kpi: {
    centralizedBurning114: 39600,
    pollutionFeeRevenue: 2693583716,  // 26.9億
    shorePowerCoverage: 20.2
  },

  ports: [
    { name:'基隆港', coord:[121.74,25.13], berths:56, lowV:13, highV:0, building:1 },
    { name:'臺北港', coord:[121.44,25.18], berths:27, lowV:10, highV:0, building:0 },
    { name:'臺中港', coord:[120.51,24.28], berths:63, lowV:5,  highV:3, building:0 },
    { name:'安平港', coord:[120.18,23.00], berths:19, lowV:5,  highV:0, building:0 },
    { name:'高雄港', coord:[120.28,22.62], berths:137,lowV:13, highV:8, building:4 },
    { name:'蘇澳港', coord:[121.86,24.59], berths:13, lowV:3,  highV:0, building:0 },
    { name:'花蓮港', coord:[121.61,23.98], berths:25, lowV:9,  highV:0, building:0 },
    { name:'麥寮港', coord:[120.24,23.77], berths:20, lowV:1,  highV:1, building:0 },
    { name:'和平港', coord:[121.65,24.17], berths:5,  lowV:2,  highV:1, building:0 }
  ],

  machineryLabels: {
    gold:   { count:7004, pct:86.4 },
    silver: { count:725,  pct:8.9  },
    bronze: { count:374,  pct:4.6  },
    total: 8103
  },

  // Module 4: choropleth — city names must be EXACTLY as in GeoJSON (臺 prefix)
  choropleth: {
    purification: [  // PM10 reduction tons per city (from cityReduction)
      {city:'臺北市',pm10:0.04},{city:'臺中市',pm10:0.86},{city:'基隆市',pm10:0.06},
      {city:'臺南市',pm10:0.49},{city:'高雄市',pm10:1.55},{city:'新北市',pm10:1.70},
      {city:'宜蘭縣',pm10:0.44},{city:'桃園市',pm10:0.41},{city:'嘉義市',pm10:0.05},
      {city:'新竹縣',pm10:0.73},{city:'苗栗縣',pm10:0.33},{city:'南投縣',pm10:0.40},
      {city:'彰化縣',pm10:0.61},{city:'新竹市',pm10:0.12},{city:'雲林縣',pm10:0.61},
      {city:'嘉義縣',pm10:0.29},{city:'屏東縣',pm10:0.67},{city:'花蓮縣',pm10:0.28},
      {city:'臺東縣',pm10:0.76},{city:'金門縣',pm10:0.24},{city:'澎湖縣',pm10:0.47},
      {city:'連江縣',pm10:0.00}
    ],
    construction: [  // sites per city
      {city:'臺北市',sites:6558},{city:'臺中市',sites:13081},{city:'基隆市',sites:1157},
      {city:'臺南市',sites:12643},{city:'高雄市',sites:9806},{city:'新北市',sites:6704},
      {city:'宜蘭縣',sites:6345},{city:'桃園市',sites:9511},{city:'嘉義市',sites:1254},
      {city:'新竹縣',sites:4292},{city:'苗栗縣',sites:3800},{city:'南投縣',sites:7937},
      {city:'彰化縣',sites:7031},{city:'新竹市',sites:3005},{city:'雲林縣',sites:7337},
      {city:'嘉義縣',sites:5251},{city:'屏東縣',sites:11866},{city:'花蓮縣',sites:4440},
      {city:'臺東縣',sites:2410},{city:'金門縣',sites:1120},{city:'澎湖縣',sites:2431},
      {city:'連江縣',sites:2447}
    ],
    fugitiveManaged: [  // managed companies per city (臺 prefix in source)
      {city:'臺北市',count:28},{city:'臺中市',count:427},{city:'基隆市',count:14},
      {city:'臺南市',count:286},{city:'高雄市',count:239},{city:'新北市',count:184},
      {city:'宜蘭縣',count:117},{city:'桃園市',count:198},{city:'嘉義市',count:10},
      {city:'新竹縣',count:63},{city:'苗栗縣',count:142},{city:'南投縣',count:67},
      {city:'彰化縣',count:178},{city:'新竹市',count:27},{city:'雲林縣',count:68},
      {city:'嘉義縣',count:67},{city:'屏東縣',count:127},{city:'花蓮縣',count:97},
      {city:'臺東縣',count:38},{city:'金門縣',count:16},{city:'澎湖縣',count:15}
    ]
  },

  rivers: [
    { name:'濁水溪', potentialHa:6553, improvedHa:2402, eventDays114:11, eventDays113:13, avgConc:36.9 },
    { name:'高屏溪', potentialHa:7008, improvedHa:1567, eventDays114:3,  eventDays113:2,  avgConc:35.5 },
    { name:'卑南溪', potentialHa:393,  improvedHa:700,  eventDays114:5,  eventDays113:3,  avgConc:18.8 }
  ],

  ecoRituals: [
    { year:'111', centralizedBurning:21517, donationNonStore:695, riceDonation:114, itemDonation:0, pureReduction:0 },
    { year:'112', centralizedBurning:29071, donationNonStore:642, riceDonation:133, itemDonation:0, pureReduction:0 },
    { year:'113', centralizedBurning:32444, donationNonStore:690, riceDonation:161, itemDonation:0, pureReduction:883 },
    { year:'114', centralizedBurning:39600, donationNonStore:1049,riceDonation:342, itemDonation:109,pureReduction:2428 }
  ],

  catering: [
    { year:'112', registered:140951, monitored:7668,  inspected:4326, compliant:3918 },
    { year:'113', registered:144257, monitored:8378,  inspected:5888, compliant:5612 },
    { year:'114', registered:149428, monitored:8547,  inspected:7599, compliant:7183 }
  ]
};
