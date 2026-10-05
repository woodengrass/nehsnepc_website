import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '教學文章編輯',
  description: 'NEHS 攝影社站內內容管理入口',
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
    body: '點選入口進入編輯器，以授權幹部的 GitHub 帳號登入。本頁不儲存帳號或私人資料。登入狀態由編輯器維護。'
  },
  {
    index: '02',
    title: '分支選擇',
    body: '編輯器提供分支選擇器。本版本無法移除或鎖定選擇器。以 preview/<使用者名稱> 分支編輯。範例為 preview/amy。儲存即提交到所選分支，不另開審核流程。注意：只有指定管理員可直接提交 main。錯字這類小修正可用此例外，其餘編輯一律走分支。'
  },
  {
    index: '03',
    title: '儲存與發佈',
    body: '只有按儲存才會寫入，打字過程不會自動儲存。新增文章預設為草稿。合併到 main 後，關閉「草稿」（即 draft:false）。等 Vercel 建置成功，文章才會出現在公開站。'
  },
  {
    index: '04',
    title: '草稿公開性',
    body: '警告：儲存庫是公開的。已提交的草稿，人人可在 GitHub 讀到。網站路由排除草稿。草稿不是機密。不可寫入不公開資訊。'
  },
  {
    index: '05',
    title: '同時編輯',
    body: '多人同時編輯同一檔案時，後儲存者覆蓋前者。編輯前先重新整理，確認取得最新內容。以 Git 方式處理衝突。'
  },
  {
    index: '06',
    title: '回退',
    body: '需回退時，執行 Git revert，還原該次提交。或在 Vercel 重新部署前一個成功部署。本頁不顯示部署狀態。'
  },
  {
    index: '07',
    title: 'Slug 更名',
    body: '警告：更改 slug 會刪除舊檔並新增新檔，不產生重新導向。舊連結失效並顯示 404。對外已分享的連結，須手動更新。'
  },
  {
    index: '08',
    title: '發佈前檢查',
    body: '發佈前先重建網站，確認頁面正常顯示。文章照片在儲存時自動產生最佳化版本，無需手動執行指令。警告：不可上傳未授權照片。'
  }
] as const;

const REPO_URL = 'https://github.com/woodengrass/nehsnepc_website';
// Exact Vercel project URL unknown at implementation time — the dashboard
// lands signed-in editors where their project is. Replace with the real
// project URL when known (Todo 10 may record it if provided).
const VERCEL_URL = 'https://vercel.com/dashboard';

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
          教學文章編輯
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
          max-w-128
          text-[0.9rem]
          leading-[1.8]
          text-[var(--color-text)]
        `}
      >
        先讀完下方教學，再從入口進入編輯器。需要協助時，請聯絡woodengrass@woodengrass.me。
      </p>

      <div
        className={`
          mt-12
          grid
          grid-cols-1
          items-start
          gap-x-12
          gap-y-12
          lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]
        `}
      >
        {/* Entry panel: first in DOM so mobile order is hero → purpose → entries → teaching. */}
        <nav
          aria-label="編輯入口"
          data-admin-entries
          className={`
            order-1
            w-full
            min-w-0
            self-start
            bg-[#101d2b]
            px-5
            py-6
            text-[var(--color-paper)]
            lg:order-2
            lg:sticky
            lg:top-[calc(var(--header-height)_+_1.5rem)]
          `}
        >
          <p
            className={`
              font-[family-name:var(--font-source)]
              text-[0.62rem]
              tracking-[0.12em]
              uppercase
              text-[var(--color-paper)]
              opacity-70
            `}
          >
            Entries／編輯入口
          </p>
          <ul className="mt-4 list-none">
            <li className="border-t border-white/15">
              <Link
                href="/keystatic"
                className={`
                  flex
                  min-h-11
                  items-center
                  justify-between
                  gap-6
                  py-5
                  text-[0.9rem]
                  tracking-[0.08em]
                  transition-colors
                  hover:text-[var(--color-red)]
                  motion-reduce:transition-none
                `}
              >
                <span>前往編輯器</span>
                <span aria-hidden="true">→</span>
              </Link>
            </li>
            <li className="border-t border-white/15">
              <Link
                href="/tutorial"
                className={`
                  flex
                  min-h-11
                  items-center
                  justify-between
                  gap-6
                  py-5
                  text-[0.9rem]
                  tracking-[0.08em]
                  transition-colors
                  hover:text-[var(--color-red)]
                  motion-reduce:transition-none
                `}
              >
                <span>教學文章頁面</span>
                <span aria-hidden="true">→</span>
              </Link>
            </li>
            <li className="border-y border-white/15">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  flex
                  min-h-11
                  items-center
                  justify-between
                  gap-6
                  py-5
                  text-[0.9rem]
                  tracking-[0.08em]
                  transition-colors
                  hover:text-[var(--color-red)]
                  motion-reduce:transition-none
                `}
              >
                <span>GH倉庫</span>
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          </ul>
        </nav>

        {/* Teaching + rules: main column. */}
        <div className="order-2 min-w-0 lg:order-1">
          <aside
            aria-label="草稿公開性提醒"
            className={`
              max-w-128
              border-l-4
              border-[var(--color-red)]
              bg-[var(--color-surface)]
              px-5
              py-4
              text-[0.85rem]
              leading-[1.8]
              text-[var(--color-text)]
            `}
          >
            警告：儲存庫是公開的，已提交的草稿人人可在 GitHub
            讀到。網站路由排除草稿，但草稿不是機密。以
            preview/&lt;使用者名稱&gt;
            分支編輯，按儲存即提交到所選分支。發佈時合併到 main，關閉「草稿」，等 Vercel 建置成功。
          </aside>

          <div
            className={`
              mt-16
              border-t
              border-[var(--color-line)]
              pt-8
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
              Teaching
            </p>
            <h2
              className={`
                mt-3
                font-[family-name:var(--font-source)]
                text-[clamp(2rem,4.5vw,3.5rem)]
                leading-[1.1]
                font-bold
                tracking-[-0.02em]
                text-[var(--color-text)]
              `}
            >
              Keystatic 基礎教學
            </h2>
            <p
              className={`
                mt-4
                max-w-128
                text-[0.9rem]
                leading-[1.8]
                text-[var(--color-text)]
              `}
            >
              編輯器把文章拆成「欄位」和「區塊」。上方欄位收標題、摘要和分類。「內文」欄位只收區塊。以下欄位名稱與編輯器畫面一致。
            </p>
          </div>

          <section
            aria-label="觀念：組裝區塊"
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
              A
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
              插入區塊類型
            </h2>
            <p
              className={`
                mt-3
                max-w-128
                text-[0.9rem]
                leading-[1.8]
                text-[var(--color-text)]
              `}
            >
              「內文」只接受三種區塊：Figure、Callout、Model3D。插入區塊、填好欄位後按儲存，網站即套用既有版式。
            </p>
            <ul
              className={`
                mt-6
                max-w-128
                list-none
                space-y-0
                text-[0.9rem]
                leading-[1.8]
                text-[var(--color-text)]
              `}
            >
              <li className="border-t border-[var(--color-line-soft)] py-3">
                Figure：填「圖片」和「替代文字」，再補「圖說」「寬度」「高度」，即完成一張內文圖片。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                Callout：選「類型」（筆記、提示或警告），可另加「標題」，即完成一段提示框。
              </li>
              <li className="border-y border-[var(--color-line-soft)] py-3">
                Model3D：填「模型路徑」和「替代文字」，可再調「長寬比」「自動旋轉」「曝光度」，即完成一個 3D 展示。
              </li>
            </ul>
          </section>

          <section
            aria-label="操作：插入一張圖片"
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
              B
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
              操作：插入一張圖片
            </h2>
            <p
              className={`
                mt-3
                max-w-128
                text-[0.9rem]
                leading-[1.8]
                text-[var(--color-text)]
              `}
            >
              下例用 Figure 示範，照順序做一次即可插入一張圖片。游標須停在文字行，不可停在表格裡。
            </p>
            <ol
              className={`
                mt-6
                max-w-128
                list-decimal
                space-y-0
                pl-6
                text-[0.9rem]
                leading-[1.8]
                text-[var(--color-text)]
                marker:text-[var(--color-muted)]
              `}
            >
              <li className="border-t border-[var(--color-line-soft)] py-3">
                把游標移到放圖位置，輸入 / 開啟插入選單，選 Figure。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                按 Choose file 上傳圖片，選錯時按 Remove 重選。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                填替代文字：描述圖片內容給看不見圖片的人聽，必填，至少四個字。圖說是圖片下方的一行小字說明，可不填。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                寬度和高度都要填，填正整數，單位是像素。兩個都填好，圖片載入時版面才不會跳動。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                按 Done 關閉面板，回到「內文」；要修改時按 Edit 重開。
              </li>
              <li className="border-y border-[var(--color-line-soft)] py-3">
                打字不會自動儲存，按 Save 才會寫入並提交。
              </li>
            </ol>
          </section>

          <section
            aria-label="流程：從儲存到發佈"
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
              C
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
              流程：從儲存到發佈
            </h2>
            <p
              className={`
                mt-3
                max-w-128
                text-[0.9rem]
                leading-[1.8]
                text-[var(--color-text)]
              `}
            >
              發佈走分支流程：先建分支、再合併。分支一律叫
              preview/&lt;使用者名稱&gt;。&lt;使用者名稱&gt;
              是 GitHub 帳號，例如 preview/amy。
            </p>
            <ol
              className={`
                mt-6
                max-w-128
                list-decimal
                space-y-0
                pl-6
                text-[0.9rem]
                leading-[1.8]
                text-[var(--color-text)]
                marker:text-[var(--color-muted)]
              `}
            >
              <li className="border-t border-[var(--color-line-soft)] py-3">
                在分支選擇器建分支，分支名是 preview/&lt;使用者名稱&gt;，按 Save 即提交到該分支。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                到預覽頁檢查排版和圖片；預覽頁只顯示已儲存的提交，未儲存的打字不會出現。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                等 Vercel 預覽部署完成，逐項確認圖片和版式。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                在 GitHub 合併分支到 main，關閉「草稿」，等建置成功後公開站才會出現文章。
              </li>
              <li className="border-y border-[var(--color-line-soft)] py-3">
                例外：指定管理員可直接提交 main。只限錯字這類小修正。小修正不必走分支。
              </li>
            </ol>
            <p
              className={`
                mt-6
                max-w-128
                text-[0.9rem]
                leading-[1.8]
                text-[var(--color-text)]
              `}
            >
              <Link href="/preview" className="underline underline-offset-4">
                前往預覽頁
              </Link>
              ：只顯示已儲存的提交。未儲存的內容不會出現。
            </p>
          </section>

          <div
            className={`
              mt-16
              border-t
              border-[var(--color-line)]
              pt-8
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
              Workflow／發佈前必讀
            </p>
            <h2
              className={`
                mt-3
                font-[family-name:var(--font-source)]
                text-[clamp(2rem,4.5vw,3.5rem)]
                leading-[1.1]
                font-bold
                tracking-[-0.02em]
                text-[var(--color-text)]
              `}
            >
              八條規則
            </h2>
          </div>

          <div
            className={`
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

          <section
            aria-label="儲存庫與部署連結"
            className={`
              mt-16
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
              Links／靜態連結
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
              儲存庫與部署
            </h2>
            <p
              className={`
                mt-3
                max-w-128
                text-[0.9rem]
                leading-[1.8]
                text-[var(--color-text)]
              `}
            >
              以下連結是靜態的，點連結即前往對應頁面。本站不在此顯示提交編號或部署狀態。需回退時執行
              Git revert 還原該次提交，或在 Vercel
              重新部署前一個成功部署。
            </p>
            <div
              className={`
                mt-6
                flex
                flex-wrap
                gap-x-8
                gap-y-3
                text-[0.9rem]
                leading-[1.8]
              `}
            >
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                GitHub 儲存庫
              </a>
              <a
                href={VERCEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                Vercel 專案
              </a>
            </div>
          </section>
        </div>
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
