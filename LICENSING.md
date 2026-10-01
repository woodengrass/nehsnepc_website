# Licensing

This repository mixes materials under different licenses. The MIT `LICENSE`
covers **source code only**. Everything else follows the map below. When in
doubt, the more restrictive license wins.

## Source code — MIT

All code (TypeScript, JavaScript, TSX, CSS, scripts, configuration) is released
under the MIT License in [`LICENSE`](./LICENSE),
Copyright (c) 2026 NEHS Photography Club.

## Photographs — all rights reserved, except Unsplash

All photographs taken by the club (`assets/sources/hero-1.jpg`,
`assets/sources/contact-bg.jpg`, `assets/sources/exposure-calculator.png`,
`assets/sources/logo.png`, About satellite sources `01`–`05`, and inline
article images) are © NEHS Photography Club, **all rights reserved**. Do not
reuse without permission.

The five About satellite sources `06`–`10` are third-party works downloaded
from Unsplash and used under the [Unsplash License](https://unsplash.com/license)
(free to use, including commercially; attribution given voluntarily here).
Photo-page links below are derived from the source filenames:

| About satellite | Source file | Photographer | Photo page |
| --- | --- | --- | --- |
| `about-satellite-06-640` | `andre-benz-PpsgIw3iWZ4-unsplash.jpg` | Andre Benz | https://unsplash.com/photos/PpsgIw3iWZ4 |
| `about-satellite-07-640` | `blake-verdoorn-cssvEZacHvQ-unsplash.jpg` | Blake Verdoorn | https://unsplash.com/photos/cssvEZacHvQ |
| `about-satellite-08-640` | `kazuend-2KXEb_8G5vo-unsplash.jpg` | Kazuend | https://unsplash.com/photos/2KXEb_8G5vo |
| `about-satellite-09-640` | `laura-smetsers-St08jKkPVHw-unsplash.jpg` | Laura Smetsers | https://unsplash.com/photos/St08jKkPVHw |
| `about-satellite-10-640` | `wan-san-yip-tLK02oHjT8c-unsplash.jpg` | Wan San Yip | https://unsplash.com/photos/tLK02oHjT8c |

Original sources live under versioned `assets/sources/` and
`assets/satellites/` directories. Generated derivatives under `public/images/generated/` inherit the
license of their source image.

## Article images — club originals plus migrated bytes

Versioned article sources under `assets/articles/<slug>/` are © NEHS
Photography Club, all rights reserved, exactly like the sources above:

- `cover.<ext>` files are per-article cover originals (the Keystatic cover
  field forces the `<fieldKey>.<ext>` name by design).
- `<uuid>-<basename><ext>` files are Figure originals (uuid-collision-safe
  editor naming; see `lib/keystatic/image-naming.ts`).

Relationship to `assets/sources/` photos: the two shipped articles were
migrated from the club originals, not re-licensed. Their versioned sources are
SHA-256 byte-identical copies — both covers equal `assets/sources/hero-1.jpg`
and both Figure originals equal `assets/sources/contact-bg.jpg` — so the
`assets/articles/` files carry the same © NEHS Photography Club,
all-rights-reserved ownership as the `assets/sources/` files they were copied
from. No new license was created by the migration; no third-party bytes are
involved.

Generated article derivatives under `public/images/generated/articles/` plus
the manifest `public/images/generated/articles.manifest.json` are unlicensed
build artifacts, not separately licensed works: they are gitignored, regenerated
by `prebuild` (`npm run images:articles`) and the dev watcher from the tracked
sources above, and must never be copied out as standalone assets. Treat them
like compiled output — the sources are the owned originals.

## Tutorial articles — CC BY-SA 4.0

All articles in `content/articles/*.mdx` are released under
[Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hant)
(CC BY-SA 4.0). You may share and adapt them with attribution, under the same
license. Each article page states its license and carries it in structured data.
