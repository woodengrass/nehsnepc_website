// 此檔只管理 About 頁要展示的照片與文字；3D 座標與動畫參數保留在場景程式內。
export const ABOUT_PHOTOS = {
  // 請將每個欄位改為未來提供的圖片路徑；目前僅使用既有圖片作為可運作的暫用內容。
  focus: new URL('../images/generated/hero-1280.webp', import.meta.url).href,
  station01Main: new URL('../images/generated/hero-1280.webp', import.meta.url).href,
  station01Satellite01: new URL('../images/generated/contact-800.webp', import.meta.url).href,
  station01Satellite02: new URL('../images/generated/hero-1280.webp', import.meta.url).href,
  station01Satellite03: new URL('../images/generated/contact-800.webp', import.meta.url).href,
  station01Satellite04: new URL('../images/generated/hero-1280.webp', import.meta.url).href,
  station02Main: new URL('../images/generated/contact-800.webp', import.meta.url).href,
  station02Satellite01: new URL('../images/generated/hero-1280.webp', import.meta.url).href,
  station02Satellite02: new URL('../images/generated/contact-800.webp', import.meta.url).href,
  station02Satellite03: new URL('../images/generated/hero-1280.webp', import.meta.url).href,
  station02Satellite04: new URL('../images/generated/contact-800.webp', import.meta.url).href,
  final: new URL('../images/generated/contact-800.webp', import.meta.url).href
};

export const ABOUT_TUNNEL_PHOTOS = ['focus', 'station01Main', 'station02Main'];

export const ABOUT_FOCUS_CONTENT = {
  eyebrow: 'NEHS NEPC / EST. 2016',
  title: '關於我們',
  prompt: '捲動以完成對焦',
  lockedPrompt: '對焦完成，繼續捲動進入畫面',
  coordinateFallback: 'LOCATION UNAVAILABLE'
};

export const ABOUT_STATIONS = [
  {
    eyebrow: '01 / 社團宗旨',
    heading: '讓攝影不再有門檻，從看懂照片開始，慢慢拍出自己的想法',
    body: '我們希望每個人都能用更簡單、直觀的方式理解攝影，並真正運用在日常中',
    photo: 'station01Main',
    satellitePhotos: ['station01Satellite01', 'station01Satellite02', 'station01Satellite03', 'station01Satellite04']
  },
  {
    eyebrow: '02 / 課程內容',
    heading: '少一點艱澀術語，多一點圖像、實拍與真正能立刻用上的攝影知識',
    body: '構圖・光線・色彩・人像・風景・後製・日常',
    photo: 'station02Main',
    satellitePhotos: ['station02Satellite01', 'station02Satellite02', 'station02Satellite03', 'station02Satellite04']
  }
];

export const ABOUT_EXIT_CONTENT = {
  index: '03 / 加入我們',
  title: ['現在立刻', '加入攝影社'],
  body: '無論只是想紀錄日常，還是想更深入學習攝影與創作，都歡迎你加入我們。',
  photo: 'final',
  actions: [
    { label: 'FOLLOW US', href: 'https://instagram.com/nehs_nepc', external: true },
    { label: 'VIEW OUR WORK', href: 'portfolio.html' }
  ]
};
