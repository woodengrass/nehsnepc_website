'use client';

import { useEffect, useMemo } from 'react';

// Client-safe Figure preview for the Keystatic document editor (ContentView).
// Must never import `node:*` or the server-only manifest helper: it renders
// in-memory uploads (Keystatic surfaces unsaved images as
// `{ data: Uint8Array, extension, filename }`) via blob URLs, saved entries
// via their raw serialized src, and a text placeholder when empty.

type InMemoryImage = {
  data: Uint8Array;
  extension?: string;
  filename?: string;
};

type EditorFigurePreviewProps = {
  src?: unknown;
  alt?: unknown;
  caption?: unknown;
};

function mimeFor(image: InMemoryImage): string {
  const ext = (image.extension ?? image.filename?.split('.').pop() ?? '').toLowerCase().replace(/^\./, '');
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'avif') return 'image/avif';
  return 'image/jpeg';
}

function textOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export default function EditorFigurePreview({ src, alt, caption }: EditorFigurePreviewProps) {
  const inMemory = useMemo<InMemoryImage | null>(() => {
    if (src !== null && typeof src === 'object' && 'data' in src) {
      const data = (src as { data: unknown }).data;
      if (data instanceof Uint8Array) {
        const rest = src as { extension?: unknown; filename?: unknown };
        return {
          data,
          extension: typeof rest.extension === 'string' ? rest.extension : undefined,
          filename: typeof rest.filename === 'string' ? rest.filename : undefined
        };
      }
    }
    return null;
  }, [src]);

  const blobUrl = useMemo<string | null>(() => {
    if (!inMemory) return null;
    try {
      // Copy through a plain ArrayBuffer so SharedArrayBuffer-backed views
      // still produce a valid Blob part in every browser.
      const bytes = new Uint8Array(inMemory.data);
      return URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: mimeFor(inMemory) }));
    } catch {
      return null;
    }
  }, [inMemory]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const rawSrc = typeof src === 'string' && src.length > 0 ? src : null;
  const resolved = blobUrl ?? rawSrc;
  const altText = textOrUndefined(alt) ?? '';
  const captionText = textOrUndefined(caption);

  if (!resolved) {
    return <span>尚未選擇圖片 / No image selected</span>;
  }
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolved} alt={altText} />
      {captionText ? <figcaption>{captionText}</figcaption> : null}
    </figure>
  );
}
