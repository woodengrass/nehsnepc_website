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
      label: 'Image',
      directory: 'assets/articles',
      publicPath: '/images/generated/articles/',
      transformFilename: figureTransformFilename
    }),
    alt: fields.text({ label: 'Alt', validation: { isRequired: true } }),
    caption: fields.text({ label: 'Caption' }),
    width: fields.integer({ label: 'Width' }),
    height: fields.integer({ label: 'Height' })
  }
});

const CalloutBlock = wrapper({
  label: 'Callout',
  schema: {
    type: fields.select({
      label: 'Type',
      options: [
        { label: 'Note', value: 'note' },
        { label: 'Tip', value: 'tip' },
        { label: 'Warning', value: 'warning' }
      ],
      defaultValue: 'note'
    }),
    title: fields.text({ label: 'Title' })
  }
});

const Model3DBlock = block({
  label: 'Model3D',
  schema: {
    src: fields.text({ label: 'Model src (path)', validation: { isRequired: true } }),
    alt: fields.text({ label: 'Alt', validation: { isRequired: true } }),
    poster: fields.text({ label: 'Poster (path, text only)' }),
    caption: fields.text({ label: 'Caption' }),
    aspect: fields.text({ label: 'Aspect', defaultValue: '4 / 3' }),
    autoRotate: fields.checkbox({ label: 'Auto rotate', defaultValue: false }),
    exposure: fields.number({ label: 'Exposure', defaultValue: 1 }),
    interactionPrompt: fields.text({
      label: 'Interaction prompt',
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
        title: fields.slug({ name: { label: 'Title', validation: { isRequired: true } } }),
        description: fields.text({ label: 'Description', multiline: true, validation: { isRequired: true } }),
        date: fields.date({ label: 'Date', validation: { isRequired: true } }),
        updated: fields.date({ label: 'Updated' }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: '攝影教學', value: 'tutorial' },
            { label: '社團動態', value: 'news' },
            { label: '3D 展示', value: 'showcase' }
          ],
          defaultValue: 'tutorial'
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
          itemLabel: (props) => props.value ?? 'Tag'
        }),
        cover: fields.image({
          label: 'Cover',
          directory: 'assets/articles',
          publicPath: '/images/generated/articles/'
        }),
        coverAlt: fields.text({ label: 'Cover alt' }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        author: fields.text({ label: 'Author', defaultValue: 'NEHS 攝影社' }),
        content: fields.mdx({
          label: 'Content',
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
