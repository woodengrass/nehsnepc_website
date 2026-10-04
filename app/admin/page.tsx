import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '教學文章編輯',
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
    body: '你點入口，你進入編輯器。你用授權幹部的 GitHub 帳號登入。本頁不儲存帳號或私人資料。登入狀態由編輯器維護。'
  },
  {
    index: '02',
    title: '分支選擇',
    body: '編輯器提供分支選擇器。本版本無法移除或鎖定選擇器。你用 preview/<使用者名稱> 分支。例如 preview/amy。你按儲存，系統提交到所選分支。系統不另開審核流程。警告：只有指定管理員可直接提交 main。只限錯字這類小修正。'
  },
  {
    index: '03',
    title: '儲存與發佈',
    body: '警告：只有你按儲存，系統才寫入。打字過程不會自動儲存。新增文章預設為草稿。你合併到 main 後，文章須關閉「草稿」。即 draft:false。Vercel 建置成功後，公開站才出現文章。'
  },
  {
    index: '04',
    title: '草稿公開性',
    body: '警告：儲存庫是公開的。已提交的草稿，人人可在 GitHub 讀到。網站路由排除草稿。草稿不是機密。你不可寫入不公開資訊。'
  },
  {
    index: '05',
    title: '同時編輯',
    body: '多人同時編輯同一檔案時，後儲存者覆蓋前者。你編輯前，你重新整理確認最新內容。你用 Git 方式處理衝突。'
  },
  {
    index: '06',
    title: '回退',
    body: '你要回退時，你執行 Git revert。你還原該次提交。或你在 Vercel 重新部署前一個成功部署。本頁不顯示部署狀態。'
  },
  {
    index: '07',
    title: 'Slug 更名',
    body: '警告：更改 slug 會刪除舊檔並新增新檔。系統不產生重新導向。舊連結失效並顯示 404。對外已分享的連結，你手動更新。'
  },
  {
    index: '08',
    title: '發佈前檢查',
    body: '你發佈前，你重建網站並確認頁面。你先跑 images:build。你產生最佳化照片版本。警告：你不可上傳未授權照片。'
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
        本頁只給社團幹部使用。你先讀完下方教學。你再從入口進入編輯器。你需要協助時，請用「聯絡」頁聯絡我們。
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
            警告：儲存庫是公開的。你提交的草稿，人人可在 GitHub
            讀到。網站路由排除草稿。草稿不是機密。你用
            preview/&lt;使用者名稱&gt;
            分支編輯。你按儲存，系統提交到所選分支。你發佈時，你合併到 main。你關閉「草稿」。你等待 Vercel 建置成功。
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
              Teaching／先學會，再動手
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
              Keystatic 不是在寫程式碼
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
              觀念：你組裝的是區塊
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
              「內文」只接受三種區塊。第一種是 Figure。第二種是 Callout。第三種是
              Model3D。你插入區塊，你填它的欄位。你按儲存，網站套用既有版式。
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
                Figure：你填「圖片」和「替代文字」。你再填「圖說」「寬度」「高度」。即完成一張內文圖片。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                Callout：你選「類型」，你可加「標題」。「類型」是筆記、提示或警告。即完成一段提示框。
              </li>
              <li className="border-y border-[var(--color-line-soft)] py-3">
                Model3D：你填「模型路徑」和「替代文字」。你可調「長寬比」「自動旋轉」「曝光度」。即完成一個 3D 展示。
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
              下例用 Figure 示範。你照順序做一次，你插入一張圖片。警告：游標須停在文字行。游標不可停在表格裡。
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
                你把游標移到放圖位置。你輸入 /，你開啟插入選單。你選 Figure。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                你按 Choose file，你上傳圖片。你選錯時，你按 Remove 重選。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                你填「替代文字」。「替代文字」必填。你用至少 4
                個字描述圖片。「圖說」選填。「圖說」顯示於圖片下方。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                你成對填「寬度」和「高度」。兩者皆為必填正整數。單位是像素。成對填寫減少版面位移。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                你按 Done，你關閉面板。你回到「內文」。你要修改時，你按 Edit 重開。
              </li>
              <li className="border-y border-[var(--color-line-soft)] py-3">
                警告：打字不會自動儲存。你按 Save，系統寫入並提交。
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
              發佈走分支流程。你先建分支，你再合併。分支一律叫
              preview/&lt;使用者名稱&gt;。&lt;使用者名稱&gt;
              是你的 GitHub 帳號。例如 preview/amy。
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
                你在分支選擇器建分支。分支名是 preview/&lt;使用者名稱&gt;。你按 Save，系統提交到該分支。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                你到預覽頁檢查排版和圖片。預覽頁只顯示已儲存的提交。未儲存的打字不會出現。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                你等待 Vercel 預覽部署完成。你逐項確認圖片和版式。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                你在 GitHub 合併分支。你合併到 main。你關閉「草稿」。你等待建置成功。公開站才會出現文章。
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
              以下連結是靜態的。你點連結，你前往對應頁面。本站不在此顯示提交編號。本站不在此顯示部署狀態。你要回退時，你執行
              Git revert。你還原該次提交。或你在 Vercel
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
