import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          src: string;
          alt: string;
          poster?: string;
          loading?: 'auto' | 'lazy' | 'eager';
          reveal?: 'auto' | 'interaction' | 'manual';
          'camera-controls'?: boolean | string;
          'auto-rotate'?: boolean | string;
          'auto-rotate-delay'?: string;
          'rotation-per-second'?: string;
          'touch-action'?: string;
          'environment-image'?: string;
          'shadow-intensity'?: string;
          exposure?: string;
          'field-of-view'?: string;
          'camera-orbit'?: string;
          'max-camera-orbit'?: string;
          'min-field-of-view'?: string;
          'max-field-of-view'?: string;
        },
        HTMLElement
      >;
    }
  }
}
