import { ImageResponse } from 'next/og';

// OG 卡片僅使用拉丁字元，避免在 OG 渲染環境中嵌入 CJK 字體。
export function getImageResponse() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          color: '#ffffff',
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 36,
            left: 36,
            right: 36,
            bottom: 36,
            border: '1px solid rgba(255, 255, 255, 0.22)',
            display: 'flex'
          }}
        />
        <div
          style={{
            display: 'flex',
            fontSize: 92,
            letterSpacing: 24,
            fontWeight: 300,
            marginBottom: 18
          }}
        >
          NEHS
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 46,
            letterSpacing: 16,
            fontWeight: 300,
            opacity: 0.85
          }}
        >
          PHOTOGRAPHY CLUB
        </div>
        <div
          style={{
            display: 'flex',
            width: 120,
            height: 1,
            background: 'rgba(255, 255, 255, 0.3)',
            marginTop: 42,
            marginBottom: 34
          }}
        />
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            letterSpacing: 10,
            fontWeight: 300,
            opacity: 0.55
          }}
        >
          LOOK CLOSER. / NEPC JOURNAL
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
