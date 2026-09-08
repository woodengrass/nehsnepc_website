import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '授權 Licensing',
  description: '本站程式碼、照片與教學文章的授權方式與出處標註。',
  alternates: { canonical: '/licensing' }
};

const UNSPLASH_CREDITS = [
  { satellite: 'about-satellite-06-640', photographer: 'Andre Benz', url: 'https://unsplash.com/photos/PpsgIw3iWZ4' },
  { satellite: 'about-satellite-07-640', photographer: 'Blake Verdoorn', url: 'https://unsplash.com/photos/cssvEZacHvQ' },
  { satellite: 'about-satellite-08-640', photographer: 'Kazuend', url: 'https://unsplash.com/photos/2KXEb_8G5vo' },
  { satellite: 'about-satellite-09-640', photographer: 'Laura Smetsers', url: 'https://unsplash.com/photos/St08jKkPVHw' },
  { satellite: 'about-satellite-10-640', photographer: 'Wan San Yip', url: 'https://unsplash.com/photos/tLK02oHjT8c' }
];

export default function LicensingPage() {
  return (
    <main className={`
      mx-auto
      w-[min(860px,calc(100%-140px))]
      pt-32
      pb-24
      max-[767px]:w-[min(calc(100%-38px),620px)]
      max-[767px]:pt-24
    `}>
      <p className={`
        mb-5
        text-[0.62rem]
        tracking-[0.14em]
        text-[var(--color-muted)]
        uppercase
      `}>
        NEHS NEPC / Licensing
      </p>
      <h1 className={`
        text-[clamp(2.4rem,5vw,4rem)]
        leading-[1]
        font-medium
        tracking-[-0.04em]
      `}>
        授權方式
      </h1>
      <p className={`
        mt-6
        max-w-[38rem]
        text-[0.92rem]
        leading-[1.8]
        text-[var(--color-muted)]
      `}>
        本站不同素材適用不同授權。以限制較多者為準。
      </p>

      <section className={`
        mt-12
        border-t
        border-[var(--color-line)]
        py-8
      `}>
        <h2 className={`
          text-[1.4rem]
          font-semibold
        `}>
          程式碼 — MIT
        </h2>
        <p className={`
          mt-3
          text-[0.9rem]
          leading-[1.8]
          text-[var(--color-muted)]
        `}>
          網站原始碼以 MIT 授權釋出，詳見 repo 根目錄的 LICENSE。
        </p>
      </section>

      <section className={`
        border-t
        border-[var(--color-line)]
        py-8
      `}>
        <h2 className={`
          text-[1.4rem]
          font-semibold
        `}>
          照片 — 版權所有，Unsplash 除外
        </h2>
        <p className={`
          mt-3
          text-[0.9rem]
          leading-[1.8]
          text-[var(--color-muted)]
        `}>
          社團拍攝的照片版權所有，未經許可請勿使用。About 衛星圖 06–10 來自
          Unsplash，依 Unsplash License 使用，出處標註如下：
        </p>
        <ul className={`
          mt-5
          grid
          gap-3
        `}>
          {UNSPLASH_CREDITS.map((credit) => (
            <li
              key={credit.satellite}
              className={`
                flex
                flex-wrap
                items-baseline
                justify-between
                gap-2
                border
                border-[var(--color-line)]
                p-4
                text-[0.85rem]
              `}
            >
              <span className={`
                text-[var(--color-muted)]
              `}>
                {credit.satellite}
              </span>
              <a
                href={credit.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  underline
                  underline-offset-4
                `}
              >
                {credit.photographer} on Unsplash
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className={`
        border-t
        border-b
        border-[var(--color-line)]
        py-8
      `}>
        <h2 className={`
          text-[1.4rem]
          font-semibold
        `}>
          教學文章 — CC BY-SA 4.0
        </h2>
        <p className={`
          mt-3
          text-[0.9rem]
          leading-[1.8]
          text-[var(--color-muted)]
        `}>
          教學文章以創用 CC 姓名標示-相同方式分享 4.0 授權釋出，歡迎分享與改作，
          需標示出處並以相同授權釋出。
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hant"
            target="_blank"
            rel="noopener noreferrer"
            className={`
              ml-2
              underline
              underline-offset-4
            `}
          >
            授權全文
          </a>
        </p>
      </section>
    </main>
  );
}
