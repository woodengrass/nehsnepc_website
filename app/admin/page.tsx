import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '內容管理',
  description: 'NEHS 攝影社站內內容管理入口，僅限社團幹部使用，不對外公開。',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false
    }
  }
};

const GUIDE_BLOCKS = [
  {
    index: '01',
    title: '登入／驗證',
    body: '點選下方按鈕進入編輯器，以授權幹部的 GitHub 帳號登入驗證身分。本頁不保存任何帳號或私人資料，登入狀態僅由編輯器維護。'
  },
  {
    index: '02',
    title: '文章管理',
    body: '在編輯器中新增或編輯教學文章。標記為草稿（draft）的文章僅供幹部預覽，不會出現在公開的教學索引中。'
  },
  {
    index: '03',
    title: '工具與頁面',
    body: '工具介紹與頁面文字同樣在編輯器中維護。儲存後請檢查預覽，確認標題、內文與連結無誤再發布。'
  },
  {
    index: '04',
    title: '注意事項',
    body: '發布前請重新建置網站並確認頁面正常顯示；照片請先經 images:build 產生最佳化版本；請勿上傳未授權照片。'
  }
] as const;

export default function AdminGateway() {
  return (
    <main data-admin-root lang="zh-TW" aria-labelledby="admin-title">
      <p
        className={`
          font-[family-name:var(--font-source)]
          text-[0.62rem]
          tracking-[0.12em]
          uppercase
          text-[var(--color-muted)]
        `}
      >
        Site — Admin／此區不對外公開。
      </p>

      <div
        className={`
          mt-8
          border-l-4
          border-[var(--color-red)]
          pl-6
          max-[767px]:pl-4
        `}
      >
        <h1
          id="admin-title"
          className={`
            font-[family-name:var(--font-source)]
            text-[clamp(3.5rem,8vw,8.5rem)]
            leading-[0.85]
            font-bold
            tracking-[-0.055em]
            text-[var(--color-text)]
            max-[767px]:text-[clamp(3.4rem,18vw,5.4rem)]
          `}
        >
          內容管理
        </h1>
        <p
          className={`
            mt-4
            font-[family-name:var(--font-source)]
            text-[0.62rem]
            tracking-[0.12em]
            uppercase
            text-[var(--color-muted)]
          `}
        >
          Admin
        </p>
      </div>

      <p
        className={`
          mt-8
          max-w-96
          text-[0.9rem]
          leading-[1.8]
          text-[var(--color-text)]
        `}
      >
        站內內容管理入口，僅限社團幹部使用。如需協助請透過「聯絡」頁與我們聯繫。
      </p>

      <Link
        href="/keystatic"
        className={`
          mt-10
          flex
          w-[clamp(16rem,28vw,24rem)]
          items-center
          justify-between
          gap-6
          border-t
          border-[#101d2b]
          bg-[#101d2b]
          px-4
          py-3
          font-[family-name:var(--font-source)]
          text-[0.9rem]
          tracking-[0.08em]
          text-[var(--color-paper)]
          transition-colors
          hover:border-[var(--color-red)]
          hover:bg-[var(--color-red)]
          hover:text-[var(--color-ink)]
          motion-reduce:transition-none
          max-[767px]:w-full
        `}
      >
        <span>前往編輯器</span>
        <span aria-hidden="true">→</span>
      </Link>

      <div
        className={`
          mt-16
          grid
          grid-cols-2
          gap-x-8
          gap-y-0
          max-[767px]:grid-cols-1
        `}
      >
        {GUIDE_BLOCKS.map((block) => (
          <section
            key={block.index}
            aria-label={block.title}
            className={`
              border-t
              border-[var(--color-line)]
              py-8
            `}
          >
            <p
              className={`
                font-[family-name:var(--font-source)]
                text-[0.62rem]
                tracking-[0.12em]
                uppercase
                text-[var(--color-muted)]
              `}
            >
              {block.index}
            </p>
            <h2
              className={`
                mt-3
                font-[family-name:var(--font-source)]
                text-[1.5rem]
                leading-[1.4]
                font-bold
                tracking-[-0.01em]
                text-[var(--color-text)]
              `}
            >
              {block.title}
            </h2>
            <p
              className={`
                mt-3
                max-w-96
                text-[0.9rem]
                leading-[1.8]
                text-[var(--color-text)]
              `}
            >
              {block.body}
            </p>
          </section>
        ))}
      </div>

      <nav
        aria-label="站內導覽"
        className={`
          mt-8
          flex
          flex-wrap
          gap-x-8
          gap-y-3
          border-t
          border-[var(--color-line)]
          pt-6
          font-[family-name:var(--font-source)]
          text-[0.9rem]
          leading-[1.8]
        `}
      >
        <Link href="/" className="underline underline-offset-4">
          返回首頁
        </Link>
        <Link href="/tutorial" className="underline underline-offset-4">
          前往教學
        </Link>
        <Link href="/contact" className="underline underline-offset-4">
          與我們聯絡
        </Link>
      </nav>
    </main>
  );
}
