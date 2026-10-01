<div align="center">
  <img src="./public/images/generated/logo-384.webp" alt="NEHS 攝影社 logo" width="120" />
  <h1>NEHS 攝影社網站</h1>
  <p>編輯式瑞士風格的攝影社網站。</p>
  <p>
    <a href="./README.md">English</a>
    ·
    <a href="./LICENSING.md">授權方式</a>
    ·
    <a href="./docs/README.md">技術文件</a>
  </p>
  <p>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="授權：MIT（程式碼）" /></a>
    <a href="https://creativecommons.org/licenses/by-sa/4.0/"><img src="https://img.shields.io/badge/Articles-CC_BY--SA_4.0-lightgrey.svg" alt="文章：CC BY-SA 4.0" /></a>
    <img src="https://img.shields.io/badge/Next.js-16-black.svg" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React-19-61DAFB.svg" alt="React 19" />
    <img src="https://img.shields.io/badge/node-%3E%3D20.9-brightgreen.svg" alt="Node >= 20.9" />
  </p>
</div>

## 目錄

- [安裝](#安裝)
- [快速開始](#快速開始)
- [運作方式](#運作方式)
- [專案結構](#專案結構)
- [授權](#授權)
- [文件](#文件)

## 安裝

需求：

- Node.js `20.9.0` 以上（Next.js 與 Sharp 要求）。
- pnpm（`packageManager` 鎖定為 pnpm@10.15.1）。

```bash
pnpm install --frozen-lockfile
```

環境範本只有佔位符（絕非真機密），請複製為 `.env.local` 再依 GitHub OAuth
App 與專案設定填寫：

```bash
cp .env.example .env.local
```

`.env.local` 已被 git 忽略；`.env.example` 留在版控內作為文件契約。變數：

| 變數 | 可見性 | 說明 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 公開、選填 | Canonical origin，預設 `https://nehsnepc.com`。不可放機密。 |
| `KEYSTATIC_GITHUB_CLIENT_ID` | 公開識別碼 | OAuth App id，至少 8 字元。 |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | 僅伺服器 | OAuth App secret，至少 20 字元。 |
| `KEYSTATIC_SECRET` | 僅伺服器 | Session secret，至少 32 字元。 |
| `KEYSTATIC_GITHUB_REPO` | 鎖定 | 必須是 `woodengrass/nehsnepc_website`。 |
| `KEYSTATIC_PRODUCTION_ORIGIN` | 僅伺服器 | 正式站 HTTPS origin 精確值，不加尾斜線。 |
| `NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE` | 僅開發 | 只在 loopback `admin:dev` 設為 `1`；正式／預覽絕不設定。 |

缺漏或過短的機密會 fail-closed（去識別化 503，只寫變數名稱）；來源不符
回傳去識別化 403。完整規則與 runbook 見
[`docs/technical-stack.md`](./docs/technical-stack.md)。

## 快速開始

| 指令 | 何時執行 |
| --- | --- |
| `npm run dev` | 本地開發（Turbopack），含文章圖片預產生與監看。GitHub 模式（不做本地寫入）。 |
| `npm run admin:dev` | Loopback 編輯器演練：僅 `127.0.0.1` 的本地 Keystatic 儲存。絕不上正式／預覽。 |
| `npm run content:validate` | 文章契約 fail-fast 檢查（`prebuild` 會自動跑）。 |
| `pnpm test:content` | 內容品質關卡（驗證器＋契約測試）。 |
| `pnpm test:admin` | 管理後台瀏覽器關卡（Playwright loopback CRUD、草稿／發布版面、auth 負測、bundle 隔離）。 |
| `npm run build` | 正式建置。這是**發布關卡**——沒有 lint、formatter 或獨立 typecheck。 |
| `npm run start` | 本地跑正式建置結果。 |
| `npm run images:build` | 改過來源圖片後執行。重新產生已提交的 AVIF/WebP 家族＋文章衍生圖（需 `sharp`）。 |
| `npm run images:articles` | 只產生文章衍生圖（`prebuild` 與 dev 監看也會跑）。 |
| `npm run models:build` | 改過 `public/models/src/` 的 GLB 後執行。輸出最佳化檔案到 `public/models/opt/`。 |

發布順序：

```bash
pnpm install --frozen-lockfile
npm run content:validate
pnpm test:content
pnpm test:admin
npm run build
```

`prebuild`（驗證器＋文章圖片）會在 `build` 前自動執行；非文章素材管線
**不包含**在 `build` 內，來源有改就要先跑對應指令再 build。

## 運作方式

**Server-first 渲染。** 路由預設是 React Server Component，只有瀏覽器行為才開
client 邊界：導覽、About 對焦體驗、聯絡互動、曝光計算器、閱讀進度、3D 模型預覽。

**重型 runtime 隔離且 lazy。** Three.js（About archive）、GSAP（About 故事線）、
`@google/model-viewer`（文章內嵌）都只在需要的路由動態載入——絕不
進 shared layout 或導覽。保持這樣。

**檔案系統內容＋瀏覽器編輯器。** 文章在 `content/articles/*.mdx`，frontmatter 由
Zod 驗證（[`lib/content.ts`](./lib/content.ts)，嚴格契約
[`lib/content-contract.ts`](./lib/content-contract.ts)）。非草稿路由在建置期
列舉，所以改內容就要重 build。`/admin` 入口通往 Keystatic GitHub 模式編輯器
（`/keystatic`）：具 repo 寫入權限者以 GitHub 登入，以結構化表單儲存文章，
每次儲存都是一次普通 Git 提交。編輯器新增預設為草稿；分支選擇器請依慣例停
在 `main`。儲存庫為公開，已提交的草稿任何人都能在 GitHub 讀到，但網站五個
版面（文章頁、首頁、分類頁、sitemap、RSS）都會排除草稿——草稿是未發布，不
是機密。細節見 [`docs/posts.md`](./docs/posts.md)，runbook 見
[`docs/technical-stack.md`](./docs/technical-stack.md)。

**曝光計算器形狀。**
[`components/tools/ExposureCalculator.tsx`](./components/tools/ExposureCalculator.tsx)
是受控的 React client 元件，攝影數學以純函數放在
[`lib/exposure/exposure.ts`](./lib/exposure/exposure.ts)。細節見
[`docs/tools.md`](./docs/tools.md)。

**SEO 用產的，不用手寫的。** Sitemap、robots、RSS、OG 圖都是路由，從同一內容
來源產生（[`lib/seo.tsx`](./lib/seo.tsx)、[`app/sitemap.ts`](./app/sitemap.ts)、
[`app/robots.ts`](./app/robots.ts)、[`app/rss.xml/route.ts`](./app/rss.xml/route.ts)、
[`app/opengraph-image.tsx`](./app/opengraph-image.tsx)）。

## 專案結構

```text
app/                    路由（App Router）。各區 layout.tsx、page.tsx，
                        sitemap/robots/rss/og-image 路由、globals.css
  about/                暗箱對焦體驗
  admin/                不索引的中文入口，通往 /keystatic
  api/keystatic/        延遲 fail-closed 的 Keystatic 路由處理
  contact/              聯絡管道＋表單
  keystatic/            OAuth 保護的編輯器 UI（不索引，預覽停用）
  tools/                工具索引＋曝光計算器路由
  tutorial/             文章首頁、category/[category]、[slug]
components/             依區域分的 UI：home、about、contact、tools、
                        articles、mdx（Figure、Callout、Model3D、MDXLink）
lib/                    共用程式：content.ts、content-contract.ts、tools.ts、
                        seo.tsx、og.tsx、format.ts、about_content.ts、
                        archive_scene.js、exposure/（純計算器模組）、
                        keystatic/（儲存關卡、圖片命名）
content/articles/       repo 自管的 MDX 文章
assets/articles/        版控的文章圖片版本化來源
public/                 靜態素材：images/generated/
                        （非文章變體已提交；文章衍生圖＋manifest 為 git 忽略
                        的建置產物）、models/src|opt/
assets/                 版控圖片來源：sources/、satellites/
scripts/                optimize_images.js、optimize_article_images.js、
                        validate_articles.ts、dev_with_article_images.mjs、
                        optimize_models.js、test_admin_workflow.ts
keystatic.config.ts     編輯器 schema（結構對應 components/mdx/*）
.env.example            只有佔位符的環境範本（複製為 .env.local）
docs/                   各領域技術文件，一個領域一份
```

## 授權

- 程式碼：MIT，見 [`LICENSE`](./LICENSE)。
- 照片：© NEHS 攝影社，版權所有；About 衛星圖 `06`–`10` 共五張依 Unsplash
  License 使用並標註出處。
- 教學文章：CC BY-SA 4.0。

完整對照與 Unsplash 出處：[`LICENSING.md`](./LICENSING.md) 與
[`/licensing`](https://nehsnepc.com/licensing) 頁。

## 文件

各領域細節在 [`docs/`](./docs/)，一份文件擁有一個領域：

| 領域 | 文件 |
| --- | --- |
| 共用 UI 與視覺系統 | [Frontend Architecture](./docs/frontend.md) |
| 工具索引與曝光計算器 | [Tools](./docs/tools.md) |
| 聯絡管道與表單 | [Contact](./docs/contact.md) |
| 暗箱與典藏體驗 | [About](./docs/about.md) |
| MDX 文章與發布 | [Posts](./docs/posts.md) |
| GLB 預覽與最佳化 | [3D Model Preview](./docs/model-preview.md) |
| Runtime、建置、素材、SEO、部署 | [Technical Stack](./docs/technical-stack.md) |

文件是實作的一部分：改程式就要在同一個 change 更新所屬文件。完整維護契約與
驗證基準見 [docs/README.md](./docs/README.md)。
