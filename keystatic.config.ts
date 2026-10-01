import { createElement } from 'react';
import { collection, config, fields } from '@keystatic/core';
import { block, wrapper } from '@keystatic/core/content-components';

import EditorFigurePreview from './components/mdx/EditorFigurePreview';
import { figureTransformFilename } from './lib/keystatic/image-naming';
import { getGithubRepo, githubStorage } from './lib/keystatic/storage';

// NOTE: `process.env` is read DIRECTLY here (no helper indirection) so that
// Next.js/Turbopack can statically inline `NEXT_PUBLIC_*` into the admin
// browser bundle. Indirect access (e.g. `isLocalMode()` reading `env.FLAG`
// through a parameter) is left `undefined` in the browser and would silently
// flip the admin UI into GitHub mode while the API stays local.
const isLocalAdmin =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE === '1';

const storage = isLocalAdmin ? ({ kind: 'local' } as const) : githubStorage(getGithubRepo());

// Minimum final-shape Keystatic config for the compat gate.
// - Public rendering stays filesystem-based (`lib/content.ts` + `next-mdx-remote/rsc`);
//   Keystatic only edits `content/articles/*.mdx` in local loopback mode.
// - Figure/Callout/Model3D mirror the exact props/defaults of `components/mdx/*`
//   so serialized MDX round-trips through the existing pipeline.
// - `title` is the slug field: frontmatter holds the display name (string),
//   the filename holds the slug — matching the current `example`/`exposure_and_brightness` shape.
// - Article image fields write versioned sources DIRECTLY under
//   `assets/articles/<entry-slug>/` and serialize public paths under
//   `/images/generated/articles/<entry-slug>/` (ADR-0004): the prebuild/dev
//   generator emits the fallback at the serialized path plus width-suffixed
//   AVIF/WebP derivatives, and public rendering derives srcsets from the
//   measured-width manifest. Raw `public/images/articles/` is never used.
// - Figure images use uuid-collision-safe `transformFilename` (honored inside the
//   MDX editor); top-level `fields.image` (cover) forces `<fieldKey>.<ext>`
//   (`cover.<ext>`), so no transform is set there. Model3D.poster stays a
//   plain text path (no upload).
// - Figure blocks preview through the client-safe `EditorFigurePreview`
//   (in-memory blob before save, raw serialized src after); public rendering
//   uses the server-only `Figure` with manifest srcsets.

const FigureBlock = block({
  label: 'Figure',
  ContentView: ({ value }) =>
    createElement(EditorFigurePreview, { src: value.src, alt: value.alt, caption: value.caption }),
  schema: {
    src: fields.image({
      label: '圖片',
      description: '透過上傳選擇內文圖片；儲存後寫入版本化來源並序列化為 managed 路徑。',
      directory: 'assets/articles',
      publicPath: '/images/generated/articles/',
      transformFilename: figureTransformFilename
    }),
    alt: fields.text({
      label: '替代文字',
      description: '必填；請用至少 4 個字描述圖片內容，供螢幕閱讀器使用。',
      validation: { isRequired: true }
    }),
    caption: fields.text({ label: '圖說', description: '選填；顯示於圖片下方的說明文字。' }),
    width: fields.integer({
      label: '寬度',
      description: '必填正整數（像素）；須與高度成對填寫，減少版面位移。'
    }),
    height: fields.integer({
      label: '高度',
      description: '必填正整數（像素）；須與寬度成對填寫，減少版面位移。'
    })
  }
});

const CalloutBlock = wrapper({
  label: 'Callout',
  schema: {
    type: fields.select({
      label: '類型',
      description: '三選一；warning 顯示紅色邊線，note / tip 顯示藍色邊線。',
      options: [
        { label: '筆記', value: 'note' },
        { label: '提示', value: 'tip' },
        { label: '警告', value: 'warning' }
      ],
      defaultValue: 'note'
    }),
    title: fields.text({ label: '標題', description: '選填；留白時顯示類型預設字樣。' })
  }
});

const Model3DBlock = block({
  label: 'Model3D',
  schema: {
    src: fields.text({
      label: '模型路徑',
      description: '必填；填 /models/opt/ 下的 .glb 檔案路徑（純文字，不上傳）。',
      validation: { isRequired: true }
    }),
    alt: fields.text({
      label: '替代文字',
      description: '必填；請用至少 4 個字描述模型內容。',
      validation: { isRequired: true }
    }),
    poster: fields.text({
      label: '預覽圖路徑',
      description: '選填；純文字路徑，不上傳，填 /images/generated/ 下的圖片。'
    }),
    caption: fields.text({ label: '圖說', description: '選填；顯示於模型下方的說明文字。' }),
    aspect: fields.text({ label: '長寬比', description: '外框比例，預設為 4 / 3。', defaultValue: '4 / 3' }),
    autoRotate: fields.checkbox({
      label: '自動旋轉',
      description: '開啟後模型載入即自動旋轉；預設關閉。',
      defaultValue: false
    }),
    exposure: fields.number({ label: '曝光度', description: '模型打光曝光值，預設為 1。', defaultValue: 1 }),
    interactionPrompt: fields.text({
      label: '操作提示文字',
      description: '顯示於模型角落的操作提示，預設為中英雙語。',
      defaultValue: 'DRAG TO ROTATE / 拖曳旋轉'
    })
  }
});

export default config({
  storage,
  collections: {
    articles: collection({
      label: 'Articles',
      path: 'content/articles/*',
      slugField: 'title',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({
          name: {
            label: '標題',
            description: '顯示於站上的文章標題；檔名 slug 由此衍生，中文標題請手動確認 slug 為英文小寫。',
            validation: { isRequired: true }
          }
        }),
        description: fields.text({
          label: '摘要',
          description: '用一句話說明這篇文章解決什麼問題；顯示於列表、SEO 與社群分享。',
          multiline: true,
          validation: { isRequired: true }
        }),
        date: fields.date({
          label: '發佈日期',
          description: '必填；ISO 日期（YYYY-MM-DD），決定排序與 RSS 發佈時間。',
          validation: { isRequired: true }
        }),
        updated: fields.date({
          label: '更新日期',
          description: '選填；文章修訂後填寫，顯示於文章頁與 sitemap。'
        }),
        category: fields.select({
          label: '分類',
          description: '三選一；決定文章所屬版面與網址分類。',
          options: [
            { label: '攝影教學', value: 'tutorial' },
            { label: '社團動態', value: 'news' },
            { label: '3D 展示', value: 'showcase' }
          ],
          defaultValue: 'tutorial'
        }),
        tags: fields.array(fields.text({ label: '標籤' }), {
          label: '標籤',
          description: '選填；請勿留首尾空白，同一篇文章內勿重複。',
          itemLabel: (props) => props.value ?? '標籤'
        }),
        cover: fields.image({
          label: '封面圖',
          description: '選填；須與封面替代文字成對出現，上傳後寫入版本化來源。',
          directory: 'assets/articles',
          publicPath: '/images/generated/articles/'
        }),
        coverAlt: fields.text({
          label: '封面替代文字',
          description: '選填；須與封面圖成對出現，至少 4 個字，描述封面內容。'
        }),
        draft: fields.checkbox({
          label: '草稿',
          description: '預設開啟；草稿僅見於開發預覽，不會發佈到正式站。發佈時請關閉。',
          defaultValue: true
        }),
        author: fields.text({
          label: '作者',
          description: '預設為 NEHS 攝影社；多人合著時可修改。',
          defaultValue: 'NEHS 攝影社'
        }),
        content: fields.mdx({
          label: '內文',
          description:
            'MDX 內文；支援 GFM 表格與連結，僅可使用 Figure、Callout、Model3D 元件。跨欄位與媒體規則由儲存後驗證把關。',
          extension: 'mdx',
          components: {
            Figure: FigureBlock,
            Callout: CalloutBlock,
            Model3D: Model3DBlock
          },
          options: {
            // Enable every construct used by the current articles (headings,
            // blockquote, lists, tables, links, dividers) so existing MDX
            // parses instead of failing to load.
            bold: true,
            italic: true,
            strikethrough: true,
            code: true,
            heading: [2, 3, 4],
            blockquote: true,
            orderedList: true,
            unorderedList: true,
            table: true,
            link: true,
            divider: true,
            codeBlock: true,
            image: {
              directory: 'assets/articles',
              publicPath: '/images/generated/articles/',
              transformFilename: figureTransformFilename
            }
          }
        })
      }
    })
  }
});
