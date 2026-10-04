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
    body: '點選入口進入編輯器，以授權幹部的 GitHub 帳號登入驗證身分。本頁不保存任何帳號或私人資料，登入狀態僅由編輯器維護。'
  },
  {
    index: '02',
    title: '分支選擇',
    body: '編輯器提供分支選擇器，本版本無法移除或鎖定。請使用 preview/<使用者名稱> 分支（例如 preview/amy）；儲存會直接提交到所選分支，不會另開審核流程。僅指定的管理員小修正（如錯字）可直接提交 main。'
  },
  {
    index: '03',
    title: '儲存與發佈',
    body: '只有按儲存才會寫入內容檔並提交，打字過程不會自動儲存。新增文章預設為草稿；分支合併到 main 後，僅當文章設為 draft:false 且 Vercel 建置成功，公開站才會出現。'
  },
  {
    index: '04',
    title: '草稿公開性',
    body: '本站儲存庫為公開，已提交的草稿任何人都能在 GitHub 上讀到。網站路由會排除草稿，但草稿不是機密，請勿寫入不公開資訊。'
  },
  {
    index: '05',
    title: '同時編輯',
    body: '多人同時編輯同一檔案可能發生衝突，以後儲存者為準。編輯前請先重新整理確認最新內容，衝突請以 Git 方式處理。'
  },
  {
    index: '06',
    title: '回退',
    body: '需回退時請以 Git revert 還原該次提交，或在 Vercel 專案中重新部署前一個成功的部署。本頁不顯示部署狀態。'
  },
  {
    index: '07',
    title: 'Slug 更名',
    body: '更改 slug 等同刪除舊檔並新增新檔，不會自動產生重新導向，舊連結會 404。對外已分享的連結請手動更新。'
  },
  {
    index: '08',
    title: '發佈前檢查',
    body: '發佈前請重新建置網站並確認頁面正常顯示；照片請先經 images:build 產生最佳化版本；請勿上傳未授權照片。'
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
        本頁是社團幹部專用的教學文章編輯入口：先讀懂下方的編輯教學與發佈規則，再從入口進入
        Keystatic 編輯器操作。如需協助請透過「聯絡」頁與我們聯繫。
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
                  py-3.5
                  text-[0.9rem]
                  tracking-[0.08em]
                  transition-colors
                  hover:text-[var(--color-red)]
                  motion-reduce:transition-none
                `}
              >
                <span>
                  前往編輯器
                  <span className="mt-1 block text-[0.8rem] leading-[1.7] tracking-normal opacity-70">
                    Keystatic 編輯器，以幹部 GitHub 帳號登入。
                  </span>
                </span>
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
                  py-3.5
                  text-[0.9rem]
                  tracking-[0.08em]
                  transition-colors
                  hover:text-[var(--color-red)]
                  motion-reduce:transition-none
                `}
              >
                <span>
                  教學文章頁面
                  <span className="mt-1 block text-[0.8rem] leading-[1.7] tracking-normal opacity-70">
                    公開教學列表，在此確認發佈結果。
                  </span>
                </span>
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
                  py-3.5
                  text-[0.9rem]
                  tracking-[0.08em]
                  transition-colors
                  hover:text-[var(--color-red)]
                  motion-reduce:transition-none
                `}
              >
                <span>
                  GH倉庫
                  <span className="mt-1 block text-[0.8rem] leading-[1.7] tracking-normal opacity-70">
                    公開儲存庫，分支建立與合併在此完成。
                  </span>
                </span>
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
            公開提醒：儲存庫為公開，已提交的草稿任何人都能在 GitHub
            上讀到；網站路由會排除草稿，但草稿不是機密。編輯時請使用
            preview/&lt;使用者名稱&gt;
            分支，儲存即提交到所選分支；發佈須合併到 main、將 draft 設為 false
            並等待 Vercel 建置成功。
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
              編輯器把文章拆成「欄位」與「區塊」：上方欄位填寫標題、摘要、分類等資料，內文欄位則用組裝的方式放入圖片與提示框。以下出現的每一個欄位名稱，都與編輯器畫面上的文字一致。
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
              「內文」欄位只接受三種區塊：Figure（圖片）、Callout（提示框）、Model3D（3D
              模型）。你不需要手寫標籤或程式碼，只要插入區塊並填寫它的欄位，存檔後網站會自動套用既有的版式呈現。
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
                Figure：填「圖片」「替代文字」「圖說」「寬度」「高度」，即完成一張內文圖片。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                Callout：選「類型」（筆記／提示／警告），可加「標題」，即完成一段提示框。
              </li>
              <li className="border-y border-[var(--color-line-soft)] py-3">
                Model3D：填「模型路徑」與「替代文字」，可調「長寬比」「自動旋轉」「曝光度」，即完成一個 3D 展示。
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
              以最常用的 Figure 為例，照著以下順序做一次，就會插入圖片。游標請停在一般文字行，不要停在表格裡。
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
                在「內文」欄位中，把游標移到要放圖的位置，輸入 / 開啟插入選單，選擇 Figure。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                在彈出的 Figure 面板中，按 Choose file 上傳圖片；若選錯，按 Remove 可移除重選。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                填寫「替代文字」（必填，請用至少 4 個字描述圖片內容）與「圖說」（選填，顯示於圖片下方）。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                成對填寫「寬度」與「高度」（必填正整數，單位像素），可減少版面位移。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                按 Done 關閉面板回到內文；之後想修改，按該區塊的 Edit 可再開啟。
              </li>
              <li className="border-y border-[var(--color-line-soft)] py-3">
                按 Save 儲存——打字與填欄位都不會自動儲存，只有 Save 會寫入並提交。
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
              發佈不再是直接改 main，而是一條分支流程：分支命名一律為 preview/&lt;使用者名稱&gt;，&lt;使用者名稱&gt;
              即你的 GitHub 帳號（例如 preview/amy）。
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
                在分支選擇器中建立 preview/&lt;使用者名稱&gt; 分支（&lt;使用者名稱&gt;
                即你的 GitHub 帳號，例如 preview/amy）；之後按 Save 儲存，都會提交到該分支。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                到預覽頁即時檢查排版與圖片（只顯示已儲存的提交，未儲存的打字不會出現）。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                等待 Vercel 預覽部署完成，逐像素確認圖片與版式。
              </li>
              <li className="border-t border-[var(--color-line-soft)] py-3">
                在 GitHub 上合併分支；合併到 main、文章設為 draft:false 且建置成功後，公開站才會出現。
              </li>
              <li className="border-y border-[var(--color-line-soft)] py-3">
                例外：指定的管理員修小錯字等小修正，可直接提交 main，不必走分支。
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
              ：僅顯示已儲存的提交，未儲存的內容不會出現。
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
              以下為靜態連結，僅供前往對應頁面；本站不會在此顯示提交編號或部署狀態。回退請以 Git revert
              還原提交，或在 Vercel 專案中重新部署前一個成功的部署。
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
