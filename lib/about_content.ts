export const ABOUT_PHOTOS = {
  focus: '/images/generated/hero-1280.webp',
  station01Main: '/images/generated/about-satellite-01-640.webp',
  station01Satellite01: '/images/generated/about-satellite-02-640.webp',
  station01Satellite02: '/images/generated/about-satellite-03-640.webp',
  station01Satellite03: '/images/generated/about-satellite-05-640.webp',
  station01Satellite04: '/images/generated/about-satellite-06-640.webp',
  station02Main: '/images/generated/about-satellite-10-640.webp',
  station02Satellite01: '/images/generated/about-satellite-04-640.webp',
  station02Satellite02: '/images/generated/about-satellite-07-640.webp',
  station02Satellite03: '/images/generated/about-satellite-08-640.webp',
  station02Satellite04: '/images/generated/about-satellite-09-640.webp',
  final: '/images/generated/logo-384.webp'
} as const;

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
] as const;

export const ABOUT_EXIT_CONTENT = {
  index: '03 / 加入我們',
  title: ['現在立刻', '加入攝影社'],
  body: '無論只是想紀錄日常，還是想更深入學習攝影與創作，都歡迎你加入我們。',
  photo: 'final',
  actions: [
    { label: 'FOLLOW US', href: 'https://instagram.com/nehs_nepc', external: true },
    { label: 'TRY OUR TOOLS', href: '/tools' }
  ]
};
