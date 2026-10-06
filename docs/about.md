# About Experience

Implementation source of truth is the code at `app/about/page.tsx`, `app/about/layout.tsx`, `components/about/AboutExperience.tsx`, `lib/about_content.ts`, `lib/archive_scene.js`, and `app/styles/about.css`. Focus constants, GSAP pin values, renderer settings, texture phases, projection math, fallback selectors, and copy strings live there and are not repeated here. This document records only decisions, external contracts, history, and the checks a maintainer cannot derive from code.

## Decisions

The route progressively enhances server-rendered content and must always retain a readable DOM fallback. The controller returns `null` and enhances known DOM selectors, so markup changes must stay synchronized across TSX, CSS, and controller code.

Scrolling stays locked until focus completes, but only when the JS controller validates and activates. Without JS, before hydration, or when validation returns early, no lock applies and the fallback remains scrollable.

GSAP and Three.js load only for motion-allowed sessions behind the focus gate; reduced-motion users never download them and get ordinary full-height DOM panels instead. The same static path handles GSAP import failure and WebGL context loss. No WebGL context restoration is attempted.

Station articles stay in the accessibility tree in DOM order after 3D initialization (clipped boxes, never `display: none`), while canvases stay decorative. Any redesign must preserve a complete semantic narrative independent of canvas output.

Texture loading overlaps initialization and prefers AVIF with WebP retry, but scene construction still waits for unlock or meaningful story progress.

## External Contracts

Visitor coordinates come from an automatic `https://ipwho.is/` lookup after load, with fallback text on failure. There is no consent gate. That is a third-party privacy and availability dependency: review it whenever location behavior changes.

## History

Station copy and image mapping centralized into `lib/about_content.ts` with separate canvas strings and DOM phrase spans so mobile lines wrap only between meaningful CJK units. The About scroll lock and archive state cleanup were hardened for React Strict Mode double-mount and bfcache (`pagehide.persisted` preserves the scene).

## Runbook

Test reduced motion before WebGL, then forced fallback (disabled JS or failed controller lookup): both stations and the afterword must be reachable by scrolling with no locks. Test scene import failure, texture failure, WebGL context loss, resize, tab hiding, route exit, reverse scrolling, and Strict Mode remounts. Recheck pin behavior after story changes and projection forward plus backward. Review `ipwho.is` privacy and failure behavior on every location change. Run `npm run images:build` when source image families change.

## Change Rule

Update this document only for decision-affecting changes: fallback policy, loading gates, motion strategy, accessibility tree treatment, scene lifecycle, or location provider. Focus tuning, pin values, renderer numbers, copy edits, or selector renames need no doc update.
