# 3D Model Preview

Implementation source of truth is the code at `components/mdx/Model3D.tsx`, `components/mdx/index.ts`, `types/model-viewer.d.ts`, and `scripts/optimize_models.js`. Props, loading margins, viewer attributes, transform calls, and directory handling live there and are not repeated here. This document records only decisions, history, and the checks a maintainer cannot derive from code. The unrelated Three.js About archive is documented in [About](./about.md).

## Decisions

The runtime stays out of shared bundles and begins loading only near a model. Neither `<model-viewer>` nor its runtime renders before first intersection. That gating is the whole performance strategy: there are no responsive model variants and no automated asset budgets, so every embed costs full browser CPU, memory, and GPU, multiplied per instance.

The optional poster is a separate decorative overlay, not the viewer-native poster attribute, and it stays present on load failure. Always ship a meaningful model description and a useful poster or fallback strategy for production exhibits. Do not enable continuous rotation without reduced-motion behavior.

Repository MDX is trusted: the component accepts arbitrary model URLs without sanitization. Same-origin `/models/opt/` references are the convention. External origins introduce CORS, tracking, reliability, and CSP concerns.

## History

The optimizer registers Draco dependencies and marks `KHRDracoMeshCompression` required but does not call the `draco()` transform. Registration plus the required flag is not evidence of compression. Validate generated files before claiming Draco compression, and add the explicit transform if compression is required. The script also reports but does not enforce size, triangle, or texture budgets, including the stated 2 MB goal. It overwrites same-name outputs but never prunes stale ones, and `npm run build` never invokes it.

Known lifecycle defects are preserved as awareness items in code: ref listeners accumulate across reattachment, the error label shares the hint class so prior interaction can fade it, failure offers no retry or diagnostics, and multiple viewers hold GPU resources with no explicit disposal.

## Runbook

Place an authored GLB in `public/models/src/`, check provenance and licensing and simplify before ingestion, run `npm run models:build`, inspect the optimized output for actual extensions, geometry, textures, animation, and size, reference it from MDX with useful description and preferably a poster, then test delayed loading, success, failure, touch scrolling, camera interaction, narrow layout, keyboard use, reduced motion, disabled WebGL, slow and offline networks, and multiple instances. Remove stale `public/models/opt/` files deliberately when sources are removed.

## Change Rule

Update this document only for decision-affecting changes: loading strategy, budget policy, trust model, Draco handling, or workflow ownership. Prop defaults, attribute lists, margin values, or transform names need no doc update.
